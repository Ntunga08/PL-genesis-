const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HealthLink", function () {
  let healthLink;
  let patient;
  let attendant;
  let unauthorized;

  beforeEach(async function () {
    [patient, attendant, unauthorized] = await ethers.getSigners();
    
    const HealthLink = await ethers.getContractFactory("HealthLink");
    healthLink = await HealthLink.deploy();
  });

  describe("Access Control", function () {
    it("Should allow patient to grant access to attendant", async function () {
      await healthLink.connect(patient).grantAccess(attendant.address);
      
      const hasAccess = await healthLink.hasAccess(patient.address, attendant.address);
      expect(hasAccess).to.equal(true);
    });

    it("Should emit AccessGranted event", async function () {
      await expect(healthLink.connect(patient).grantAccess(attendant.address))
        .to.emit(healthLink, "AccessGranted")
        .withArgs(patient.address, attendant.address);
    });

    it("Should allow patient to revoke access", async function () {
      await healthLink.connect(patient).grantAccess(attendant.address);
      await healthLink.connect(patient).revokeAccess(attendant.address);
      
      const hasAccess = await healthLink.hasAccess(patient.address, attendant.address);
      expect(hasAccess).to.equal(false);
    });

    it("Should emit AccessRevoked event", async function () {
      await healthLink.connect(patient).grantAccess(attendant.address);
      
      await expect(healthLink.connect(patient).revokeAccess(attendant.address))
        .to.emit(healthLink, "AccessRevoked")
        .withArgs(patient.address, attendant.address);
    });
  });

  describe("Record Management", function () {
    beforeEach(async function () {
      // Grant access to attendant
      await healthLink.connect(patient).grantAccess(attendant.address);
    });

    it("Should allow authorized attendant to add record", async function () {
      const ipfsHash = "QmTest123";
      const recordType = "form";

      await healthLink.connect(attendant).addRecord(
        patient.address,
        ipfsHash,
        recordType
      );

      const records = await healthLink.connect(patient).getMyRecords();
      expect(records.length).to.equal(1);
      expect(records[0].ipfsHash).to.equal(ipfsHash);
      expect(records[0].recordType).to.equal(recordType);
      expect(records[0].addedBy).to.equal(attendant.address);
    });

    it("Should emit RecordAdded event", async function () {
      const ipfsHash = "QmTest123";
      const recordType = "form";

      await expect(
        healthLink.connect(attendant).addRecord(patient.address, ipfsHash, recordType)
      )
        .to.emit(healthLink, "RecordAdded")
        .withArgs(patient.address, ipfsHash);
    });

    it("Should revert when unauthorized attendant tries to add record", async function () {
      const ipfsHash = "QmTest123";
      const recordType = "form";

      await expect(
        healthLink.connect(unauthorized).addRecord(patient.address, ipfsHash, recordType)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should allow authorized attendant to view records", async function () {
      await healthLink.connect(attendant).addRecord(
        patient.address,
        "QmTest123",
        "form"
      );

      const records = await healthLink.connect(attendant).getRecords(patient.address);
      expect(records.length).to.equal(1);
    });

    it("Should revert when unauthorized attendant tries to view records", async function () {
      await expect(
        healthLink.connect(unauthorized).getRecords(patient.address)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should allow patient to view own records without authorization", async function () {
      await healthLink.connect(attendant).addRecord(
        patient.address,
        "QmTest123",
        "form"
      );

      const records = await healthLink.connect(patient).getMyRecords();
      expect(records.length).to.equal(1);
      expect(records[0].ipfsHash).to.equal("QmTest123");
    });

    it("Should handle multiple records correctly", async function () {
      await healthLink.connect(attendant).addRecord(patient.address, "QmHash1", "form");
      await healthLink.connect(attendant).addRecord(patient.address, "QmHash2", "file");
      await healthLink.connect(attendant).addRecord(patient.address, "QmHash3", "form");

      const records = await healthLink.connect(patient).getMyRecords();
      expect(records.length).to.equal(3);
      expect(records[0].ipfsHash).to.equal("QmHash1");
      expect(records[1].ipfsHash).to.equal("QmHash2");
      expect(records[2].ipfsHash).to.equal("QmHash3");
    });
  });
});
