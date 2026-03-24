// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HealthLink {
    struct Record {
        string ipfsHash;
        string recordType;
        uint256 timestamp;
        address addedBy;
    }

    mapping(address => Record[]) private records;
    mapping(address => mapping(address => bool)) private accessList;

    event AccessGranted(address indexed patient, address indexed attendant);
    event AccessRevoked(address indexed patient, address indexed attendant);
    event RecordAdded(address indexed patient, string ipfsHash);

    modifier onlyAuthorized(address patient) {
        require(accessList[patient][msg.sender], "Not authorized");
        _;
    }

    function grantAccess(address attendant) external {
        accessList[msg.sender][attendant] = true;
        emit AccessGranted(msg.sender, attendant);
    }

    function revokeAccess(address attendant) external {
        accessList[msg.sender][attendant] = false;
        emit AccessRevoked(msg.sender, attendant);
    }

    function addRecord(
        address patient,
        string calldata ipfsHash,
        string calldata recordType
    ) external onlyAuthorized(patient) {
        records[patient].push(
            Record(ipfsHash, recordType, block.timestamp, msg.sender)
        );
        emit RecordAdded(patient, ipfsHash);
    }

    function getRecords(address patient)
        external
        view
        onlyAuthorized(patient)
        returns (Record[] memory)
    {
        return records[patient];
    }

    function getMyRecords() external view returns (Record[] memory) {
        return records[msg.sender];
    }

    function hasAccess(address patient, address attendant)
        external
        view
        returns (bool)
    {
        return accessList[patient][attendant];
    }
}
