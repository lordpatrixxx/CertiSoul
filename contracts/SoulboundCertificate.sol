// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SoulboundCertificate
 * @notice Production-grade non-transferable (soulbound) credential smart contract for HACKBLOX 2026.
 * @dev Implements OpenZeppelin v5.x ERC721URIStorage and Ownable.
 * Transfers and approvals are permanently blocked after minting.
 * Revocation preserves the token record, ownership, and tokenURI while updating status on-chain.
 */
contract SoulboundCertificate is ERC721URIStorage, Ownable {
    // =========================================================================
    // Custom Errors
    // =========================================================================
    error ZeroAddressRecipient();
    error EmptyTokenURI();
    error UnauthorizedIssuer(address caller);
    error UnauthorizedRevocation(uint256 tokenId, address caller);
    error CertificateAlreadyRevoked(uint256 tokenId);
    error SoulboundTransferBlocked(uint256 tokenId);
    error SoulboundApprovalBlocked();
    error InvalidIssuerAddress();

    // =========================================================================
    // Data Structures
    // =========================================================================
    struct CertificateRecord {
        uint256 tokenId;
        address recipient;
        address issuer;
        uint64 issueTimestamp;
        bool isRevoked;
        uint64 revokedTimestamp;
        string revocationReason;
    }

    // =========================================================================
    // State Variables
    // =========================================================================
    uint256 private _nextTokenId;

    /// @notice Whitelist of authorized institutions / issuers
    mapping(address => bool) public isAuthorizedIssuer;

    /// @notice On-chain certificate record by token ID
    mapping(uint256 => CertificateRecord) private _certificates;

    /// @notice List of token IDs owned by a recipient address
    /// @dev Storage insertion on mint is O(1). Reading all tokens via getTokensByOwner is O(N)
    /// where N is the number of certificates owned by the recipient.
    mapping(address => uint256[]) private _tokensOfOwner;

    // =========================================================================
    // Events
    // =========================================================================
    event IssuerAuthorized(address indexed issuer, uint256 timestamp);
    event IssuerDeauthorized(address indexed issuer, uint256 timestamp);
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        address indexed issuer,
        string tokenURI,
        uint256 timestamp
    );
    event CertificateRevoked(
        uint256 indexed tokenId,
        address indexed caller,
        string reason,
        uint256 timestamp
    );

    // =========================================================================
    // Modifiers
    // =========================================================================
    modifier onlyIssuer() {
        if (!isAuthorizedIssuer[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedIssuer(msg.sender);
        }
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================
    /**
     * @notice Initializes the Soulbound Certificate collection and sets the initial contract owner.
     * @param initialOwner The address designated as the contract administrator.
     */
    constructor(address initialOwner)
        ERC721("Soulbound Certificate", "SBCERT")
        Ownable(initialOwner)
    {
        if (initialOwner == address(0)) revert ZeroAddressRecipient();
    }

    // =========================================================================
    // Issuer Management (Admin Only)
    // =========================================================================
    /**
     * @notice Authorizes a new issuer address to mint certificates.
     * @param issuer The address of the university/organization issuer.
     */
    function authorizeIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert InvalidIssuerAddress();
        isAuthorizedIssuer[issuer] = true;
        emit IssuerAuthorized(issuer, block.timestamp);
    }

    /**
     * @notice De-authorizes an existing issuer address.
     * @param issuer The address to revoke minting privileges from.
     */
    function deauthorizeIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert InvalidIssuerAddress();
        isAuthorizedIssuer[issuer] = false;
        emit IssuerDeauthorized(issuer, block.timestamp);
    }

    // =========================================================================
    // Minting Functionality
    // =========================================================================
    /**
     * @notice Mints a non-transferable soulbound certificate to a student wallet.
     * @dev Only whitelisted issuers or the contract owner can mint.
     * @param to The recipient student address.
     * @param uri The IPFS metadata URI (e.g., "ipfs://bafkrei...").
     * @return tokenId The unique ID of the minted certificate.
     */
    function mintCertificate(address to, string calldata uri)
        external
        onlyIssuer
        returns (uint256)
    {
        if (to == address(0)) revert ZeroAddressRecipient();
        if (bytes(uri).length == 0) revert EmptyTokenURI();

        uint256 tokenId = ++_nextTokenId;

        // Mint NFT directly to student recipient
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        // Store persistent on-chain record
        _certificates[tokenId] = CertificateRecord({
            tokenId: tokenId,
            recipient: to,
            issuer: msg.sender,
            issueTimestamp: uint64(block.timestamp),
            isRevoked: false,
            revokedTimestamp: 0,
            revocationReason: ""
        });

        // O(1) storage insertion for discovery
        _tokensOfOwner[to].push(tokenId);

        emit CertificateMinted(tokenId, to, msg.sender, uri, block.timestamp);

        return tokenId;
    }

    // =========================================================================
    // Revocation Functionality (Non-burning)
    // =========================================================================
    /**
     * @notice Revokes a certificate without transferring or burning the NFT.
     * @dev Strictly callable ONLY by the original issuer of this certificate OR the contract owner/admin.
     * An authorized issuer B cannot revoke a certificate issued by issuer A.
     * Token remains in student wallet to preserve verifiable audit history.
     * @param tokenId The ID of the certificate to revoke.
     * @param reason The official revocation reason string.
     */
    function revokeCertificate(uint256 tokenId, string calldata reason) external {
        _requireOwned(tokenId);

        CertificateRecord storage cert = _certificates[tokenId];

        // Strict authorization: Only original issuer or contract admin
        if (msg.sender != cert.issuer && msg.sender != owner()) {
            revert UnauthorizedRevocation(tokenId, msg.sender);
        }

        if (cert.isRevoked) {
            revert CertificateAlreadyRevoked(tokenId);
        }

        cert.isRevoked = true;
        cert.revokedTimestamp = uint64(block.timestamp);
        cert.revocationReason = reason;

        emit CertificateRevoked(tokenId, msg.sender, reason, block.timestamp);
    }

    // =========================================================================
    // View Functions for Discovery & Public Verification
    // =========================================================================
    /**
     * @notice Retrieves the full on-chain certificate record.
     * @param tokenId The ID of the certificate.
     */
    function getCertificate(uint256 tokenId)
        external
        view
        returns (CertificateRecord memory)
    {
        _requireOwned(tokenId);
        return _certificates[tokenId];
    }

    /**
     * @notice Retrieves all token IDs owned by a recipient address.
     * @dev Read performance is O(N) where N is the number of certificates owned by the student.
     * @param recipient The address of the student.
     * @return Array of token IDs owned by recipient.
     */
    function getTokensByOwner(address recipient)
        external
        view
        returns (uint256[] memory)
    {
        return _tokensOfOwner[recipient];
    }

    /**
     * @notice Returns total number of certificates minted so far.
     */
    function totalCertificates() external view returns (uint256) {
        return _nextTokenId;
    }

    // =========================================================================
    // Soulbound Enforcements (OpenZeppelin v5 Overrides)
    // =========================================================================
    /**
     * @dev Overrides OpenZeppelin v5 `_update` to permanently block token transfers.
     * Minting (from == address(0)) is permitted. Any subsequent transfer reverts.
     * Burning is NOT supported to ensure the soulbound record remains immutable.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            revert SoulboundTransferBlocked(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Disables approvals: soulbound tokens cannot be approved for transfer.
     */
    function approve(address /* to */, uint256 /* tokenId */)
        public
        pure
        override(ERC721, IERC721)
    {
        revert SoulboundApprovalBlocked();
    }

    /**
     * @dev Disables operator approvals: soulbound tokens cannot have transfer operators.
     */
    function setApprovalForAll(address /* operator */, bool /* approved */)
        public
        pure
        override(ERC721, IERC721)
    {
        revert SoulboundApprovalBlocked();
    }

    /**
     * @dev Resolves inheritance conflict between ERC721 and ERC721URIStorage.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Resolves inheritance conflict for supportsInterface.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
