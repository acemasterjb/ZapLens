require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();
const { dataIDs } = require("./dataIDs");


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

