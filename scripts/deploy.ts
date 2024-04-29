import { ethers } from "hardhat";
import * as fs from "node:fs";
import "@nomicfoundation/hardhat-toolbox";

async function main() {
  // The main task of deployment is to properly produce the arrays needed for the constructor to know which trading pairs and Chainlink
  // feeds are associated with one another. This is done by reading PairsAndFeeds.json. This script produces a .env file
  // containing the address of the deployed TradingBot contract which will be necessary for all subsequent interactions with the contract.
  const PairsAndFeedsJson = JSON.parse(
    fs.readFileSync("./PairsAndFeedsBSC.json").toString()
  );
  const RouterAddressJson = JSON.parse(
    fs.readFileSync("./PCSRouterAddressBSC.json").toString()
  );
  let symbols = [];
  let feeds = [];
  let token1 = [];
  let token2 = [];

  for (let i = 0; i < PairsAndFeedsJson.length; i++) {
    symbols[i] = PairsAndFeedsJson[i].symbol;
    feeds[i] = PairsAndFeedsJson[i].feed;
    token1[i] = PairsAndFeedsJson[i].asset1;
    token2[i] = PairsAndFeedsJson[i].asset2;
  }

  console.log(symbols, feeds, token1, token2);

  // let finalString = "";
  // const TradingBot = await ethers.getContractFactory("TradingBot");
  // const bot = await TradingBot.deploy(
  //   RouterAddressJson.address,
  //   symbols,
  //   feeds,
  //   token1,
  //   token2
  // );
  // await bot.waitForDeployment();
  // const botAddress = await bot.getAddress();
  // console.log(`TradingBot deployed to ${botAddress}`);

  // finalString += "TRADINGBOT=" + botAddress + "\n";

  // fs.writeFileSync("./.env", finalString);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
