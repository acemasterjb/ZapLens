require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');
require("dotenv").config();
const { merge } = require('sol-merger');
const { dataIDs } = require("./dataIDs");
const fs = require('fs');  // required for reading upgradable contract addresses
// const { task } = require("hardhat/config");
// const { task } = require("hardhat/config");
// const { run } = require("hardhat");


task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("deploy", "Deploy and verify the contracts")
  .addParam("oracleAddress", "The master contract address")
  .setAction(async taskArgs => {
    var oracleAddress = taskArgs.oracleAddress
    await run("compile");
    const t = await ethers.getContractFactory("Aggregator");
    const contract = await t.deploy(oracleAddress);
    // const contract = upgrades.deployProxy(t, [oracleAddress], { initializer: 'init' });
    await contract.deployed();
    console.log("contract deployed to:", "https://" + taskArgs.network + ".bscscan.io/address/" + contract.address);
    console.log("    transaction hash:", "https://" + taskArgs.network + ".bscscan.io/tx/" + contract.deployTransaction.hash);

    // Wait for few confirmed transactions.
    // Otherwise the etherscan api doesn't find the deployed contract.
    console.log('waiting for tx confirmation...');
    await contract.deployTransaction.wait(3)


    console.log("Adding Data IDs")
    await contract.replaceDataIDs(dataIDs);

    console.log('submitting for etherscan verification...');
    await run("verify:verify", {
      address: contract.address,
      constructorArguments: [oracleAddress],
    })

  });

task("upgrade", "Upgrade the Aggregator contract")
  .addParam("address", "The aggregator contract address")
  .setAction(async taskArgs => {
    var aggregatorAddress = taskArgs.address
    await run("compile");
    const t = await ethers.getContractFactory("Aggregator");
    // const contract = await t.deploy(aggregatorAddress);
    await upgrades.upgradeProxy(aggregatorAddress, t);
    console.log("Aggregator upgraded.");
    // await contract.deployed();
    // console.log("contract deployed to:", "https://" + taskArgs.network + ".bscscan.io/address/" + contract.address);
    // console.log("    transaction hash:", "https://" + taskArgs.network + ".bscscan.io/tx/" + contract.deployTransaction.hash);

    // // Wait for few confirmed transactions.
    // // Otherwise the etherscan api doesn't find the deployed contract.
    // console.log('waiting for tx confirmation...');
    // await contract.deployTransaction.wait(3)


    // console.log("Adding Data IDs")
    // await contract.replaceDataIDs(dataIDs);

    // console.log('submitting for etherscan verification...');
    // await run("verify:verify", {
    //   address: contract.address,
    //   constructorArguments: [aggregatorAddress],
    // })
  });

task("deployZap", "Deploys the ZapMaster Contract")
  // .addParam("zapops", "ZapOps address")
  // .addParam("zaptoken", "ZapToken address")
  .setAction(async taskArgs => {
    var zapOpsAddress = taskArgs.zapOps;
    var zapTokenAddress = taskArgs.zapToken;
    await run("compile");

    const zapTransferFactory = await ethers.getContractFactory("ZapTransfer");
    const ZapTransfer = await zapTransferFactory.deploy();
    // const ZapTransfer = await upgrades.deployProxy(zapTransferFactory);
    await ZapTransfer.deployed();
    console.log("ZapTransfer deployed: ", ZapTransfer.address);

    const zapLibraryFactory = await ethers.getContractFactory("ZapLibrary",
      {
        libraries: {
          ZapTransfer: ZapTransfer.address
        }
      }
    );
    const ZapLibrary = await zapLibraryFactory.deploy();
    // const ZapLibrary = await upgrades.deployProxy(zapLibraryFactory);
    await ZapLibrary.deployed();
    console.log("ZapLibrary deployed: ", ZapLibrary.address);

    const zapDisputeFactory = await ethers.getContractFactory("ZapDispute", {
      libraries: {
        ZapTransfer: ZapTransfer.address,
      }
    });
    const ZapDispute = await zapDisputeFactory.deploy();
    // const ZapDispute = await upgrades.deployProxy(zapDisputeFactory);
    await ZapDispute.deployed();
    console.log("ZapDispute deployed: ", ZapDispute.address);

    const zapStakeFactory = await ethers.getContractFactory("ZapStake", {
      libraries: {
        ZapTransfer: ZapTransfer.address,
        ZapDispute: ZapDispute.address
      }
    });
    const ZapStake = await zapStakeFactory.deploy();
    // const ZapStake = await upgrades.deployProxy(zapStakeFactory);
    await ZapStake.deployed();
    console.log("ZapStake deployed: ", ZapStake.address);

        const zapOpsFactory = await ethers.getContractFactory("Zap",
      {
        libraries: {
          ZapStake: ZapStake.address,
          ZapDispute: ZapDispute.address,
          ZapLibrary: ZapLibrary.address,
        }
      }
    );
    const ZapOps = await zapOpsFactory.deploy("0x09d8af358636d9bcc9a3e177b66eb30381a4b1a8");
    // const ZapOps = await upgrades.deployProxy(zapOpsFactory, ["0x09d8af358636d9bcc9a3e177b66eb30381a4b1a8"], { initializer: 'init' });
    await ZapOps.deployed()
    console.log("Zap Ops deployed: ", ZapOps.address);

    const zapMasterFactory = await ethers.getContractFactory("ZapMaster", {
      libraries: {
        ZapTransfer: ZapTransfer.address,
        ZapStake: ZapStake.address
      }
    });
    const ZapMaster = await zapMasterFactory.deploy(ZapOps.address, "0x09d8af358636d9bcc9a3e177b66eb30381a4b1a8");
    // const ZapMaster = await upgrades.deployProxy(zapMasterFactory, [ZapOps.address, "0x09d8af358636d9bcc9a3e177b66eb30381a4b1a8"], { initializer: 'init' })
    await ZapMaster.deployed();
    // console.log("deployed")

    console.log("ZapMaster contract deployed to:", "https://" + taskArgs.network + ".bscscan.com/address/" + ZapMaster.address);
    console.log("    transaction hash:", "https://" + taskArgs.network + ".bscscan.com/tx/" + ZapMaster.deployTransaction.hash);

    await ZapMaster.deployTransaction.wait(3);

    console.log('submitting for etherscan verification...');
    await run("verify:verify", {
      address: ZapMaster.address,
      constructorArguments: [ZapOps.address, "0x09d8af358636d9bcc9a3e177b66eb30381a4b1a8"],
      libraries: {
        ZapStake: ZapStake.address
      }
    });
    
});

task("upgradeZap", "Upgrades the ZapMiner contract")
  .addParam("addresses", "path to a file holding the addresses.json")
  .setAction(async taskArgs => {
    var zapOpsAddress = taskArgs.zapOps;
    var zapTokenAddress = taskArgs.zapToken;
    await run("compile");
    address = fs.readFileSync(taskArgs.addrresses, 'utf8');

    var contracts = JSON.parse(address);

    const zapTransferFactory = await ethers.getContractFactory("ZapTransfer");
    // const ZapTransfer = await zapTransferFactory.deploy();
    await upgrades.upgradeProxy(contracts.zapTransfer.address, zapTransferFactory);
    await ZapTransfer.deployed();
    console.log("ZapTransfer deployed: ", ZapTransfer.address);

    const zapLibraryFactory = await ethers.getContractFactory("ZapLibrary",
      {
        libraries: {
          ZapTransfer: ZapTransfer.address
        }
      }
    );
    // const ZapLibrary = await zapLibraryFactory.deploy();
    await upgrades.upgradeProxy(contracts.zapLibrary.address, zapLibraryFactory);
    await ZapLibrary.deployed();
    console.log("ZapLibrary deployed: ", ZapLibrary.address);

    const zapDisputeFactory = await ethers.getContractFactory("ZapDispute", {
      libraries: {
        ZapTransfer: ZapTransfer.address,
      }
    });
    // const ZapDispute = await zapDisputeFactory.deploy();
    await upgrades.upgradeProxy(contracts.zapDispute.address, zapDisputeFactory);
    await ZapDispute.deployed();
    console.log("ZapDispute deployed: ", ZapDispute.address);

    const zapStakeFactory = await ethers.getContractFactory("ZapStake", {
      libraries: {
        ZapTransfer: ZapTransfer.address,
        ZapDispute: ZapDispute.address
      }
    });
    // const ZapStake = await zapStakeFactory.deploy();
    await upgrades.upgradeProxy(contracts.zapStake.address, zapStakeFactory);
    await ZapStake.deployed();
    console.log("ZapStake deployed: ", ZapStake.address);

        const zapOpsFactory = await ethers.getContractFactory("Zap",
      {
        libraries: {
          ZapStake: ZapStake.address,
          ZapDispute: ZapDispute.address,
          ZapLibrary: ZapLibrary.address,
        }
      }
    );
    // const ZapOps = await zapOpsFactory.deploy("0x09d8af358636d9bcc9a3e177b66eb30381a4b1a8");
    await upgrades.upgradeProxy(contracts.zapOps.address, zapOpsFactory);
    await ZapOps.deployed()
    console.log("Zap Ops deployed: ", ZapOps.address);

    const zapMasterFactory = await ethers.getContractFactory("ZapMaster", {
      libraries: {
        ZapTransfer: ZapTransfer.address,
        ZapStake: ZapStake.address
      }
    });
    // const ZapMaster = await zapMaster.deploy(ZapOps.address, "0x09d8af358636d9bcc9a3e177b66eb30381a4b1a8");
    await upgrades.upgradeProxy(contracts.zapMaster.address, zapMasterFactory);
    await ZapMaster.deployed();
    // console.log("deployed")
  });

  task("verifyZap", "Verifies miner contracts")
    .addParam("dir")
    .addParam("contract")
    .setAction(async taskArgs => {
      await run("compile");
      var addresses = fs.readFileSync(taskArgs.dir, 'utf8');
      addresses = JSON.parse(addresses);
      const contract = taskArgs.contract;

      for (let i = 4; i < addresses.length; i++) {
        if (addresses[i].name == contract){
          await run("verify:verify", {
            address: addresses[i].address,
            constructorArguments: [...addresses[i].arguments],
            libraries:{...addresses[i].libraries}
          })
        }
      }
    });

  task("merge", "Merges a given contracts imports into one file")
    .addParam("dir")
    .setAction(async taskArgs => {
      await run("compile")
      const contract = taskArgs.dir;
      console.log("Merging contracts...");
      const mergedCode = await merge(contract);
      console.log("\tdone");

      if (!fs.existsSync("./mergedContracts")){
        fs.mkdirSync("./mergedContracts")
      }    
      console.log("Writing to file...")
      fs.writeFileSync("./mergedContracts/lastMerged.sol", mergedCode);
      console.log("\tdone");
    })
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    testnet: {
      url: `${process.env.NODE_URL_TESTNET}`,
      accounts: [process.env.PRIVATE_KEY]
    },
    mainnet: {
      url: `${process.env.NODE_URL_SMARTCHAIN}`,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN
  },
  solidity: {
    compilers: [
      { version: "0.5.17" },
      { version: "0.5.16" },
      { version: "0.7.0" },
      {
        version: "0.7.6",
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    ]
  },
};

