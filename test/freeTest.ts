import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, Contract } from "ethers";
import dotenv from "dotenv";
import * as fs from "node:fs";

dotenv.config();
const minABI = [ { constant: true, inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256'}], type: 'function', },];
const TradingBotJson = fs.readFileSync("./artifacts/contracts/LimitOrderEngineETH.sol/TradingBotETH.json");
const IERC20Json = fs.readFileSync("./artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json");
const PairsAndFeedsJson = JSON.parse(fs.readFileSync("./PairsAndFeedsETH.json").toString());
const TradingBotAddress = process.env.TRADINGBOT!;
//const USDCAddress = PairsAndFeedsJson[9].asset2; // Those are the right array numbers to get those addresses in PairsAndFeedsBSC.json
//const BTCAddress = PairsAndFeedsJson[9].asset1;
//const BTCUSDCFeed = PairsAndFeedsJson[9].feed;
//const ETHAddress = PairsAndFeedsJson[8].asset2;
//const BTCETHFeed = PairsAndFeedsJson[8].feed;
const USDCAddress = PairsAndFeedsJson[6].asset2; // Those are the right array numbers to get those addresses in PairsAndFeedsETH.json
const BTCAddress = PairsAndFeedsJson[6].asset1;
const BTCUSDCFeed = PairsAndFeedsJson[6].feed;
const BTCUSDCMATICAddress = PairsAndFeedsJson[14].asset2;
const MATICUSDCFeed = PairsAndFeedsJson[14].feed;
const MATICAddress = PairsAndFeedsJson[14].asset1;
const PRECISION = 10n**6n;
const PRECISIONMATIC = 10n**18n;

let owner: Signer;
let otherAccount: Signer;
let otherAccount2: Signer;
let otherAccount3: Signer;
let TradingBotContract: Contract;
let TradingBotContract2: Contract;
let TradingBotContract3: Contract;
let TradingBotContract4: Contract;
let USDCContract: Contract;
let USDCContract2: Contract;
let USDCContract3: Contract;
let USDCContract4: Contract;
let BTCBContract: Contract;
let BTCBContract2: Contract;
let BTCBContract3: Contract;
let BTCBContract4: Contract;
let IERC20Contract: Contract;
let IERC20Contract2: Contract;
let IERC20Contract3: Contract;
let IERC20Contract4: Contract;
let MATICContract: Contract;
let IERC20MATICContract: Contract;

describe("Testing Suite for Limit Orders / Stop Loss / Take Profits Smart Contract System", function () {
    
    before(async function() {
      [owner, otherAccount, otherAccount2, otherAccount3] = await ethers.getSigners();
      TradingBotContract = new ethers.Contract(TradingBotAddress, JSON.parse(TradingBotJson.toString()).abi, owner);
      TradingBotContract2 = new ethers.Contract(TradingBotAddress, JSON.parse(TradingBotJson.toString()).abi, otherAccount);
      TradingBotContract3 = new ethers.Contract(TradingBotAddress, JSON.parse(TradingBotJson.toString()).abi, otherAccount2);
      TradingBotContract4 = new ethers.Contract(TradingBotAddress, JSON.parse(TradingBotJson.toString()).abi, otherAccount3);
      USDCContract = new ethers.Contract(USDCAddress, minABI, owner);
      USDCContract2 = new ethers.Contract(USDCAddress, minABI, otherAccount);
      USDCContract3 = new ethers.Contract(USDCAddress, minABI, otherAccount2);
      USDCContract4 = new ethers.Contract(USDCAddress, minABI, otherAccount3);
      BTCBContract = new ethers.Contract(BTCAddress, minABI, owner);
      BTCBContract2 = new ethers.Contract(BTCAddress, minABI, otherAccount);
      BTCBContract3 = new ethers.Contract(BTCAddress, minABI, otherAccount2);
      BTCBContract4 = new ethers.Contract(BTCAddress, minABI, otherAccount3);
      IERC20Contract = new ethers.Contract(USDCAddress, JSON.parse(IERC20Json.toString()).abi, owner);
      IERC20Contract2 = new ethers.Contract(USDCAddress, JSON.parse(IERC20Json.toString()).abi, otherAccount);
      IERC20Contract3 = new ethers.Contract(USDCAddress, JSON.parse(IERC20Json.toString()).abi, otherAccount2);
      IERC20Contract4 = new ethers.Contract(USDCAddress, JSON.parse(IERC20Json.toString()).abi, otherAccount3);
      MATICContract = new ethers.Contract(MATICAddress, minABI, owner);
      IERC20MATICContract = new ethers.Contract(MATICAddress, JSON.parse(IERC20Json.toString()).abi, owner);
    });

    describe("Single Transactions", function () {
      
        it("Should retrieve price feed data from Chainlink", async function () {
          const response = await TradingBotContract.getChainlinkDataFeedLatestAnswer.staticCall(BTCUSDCFeed);
          expect(response).to.be.a('bigint');
        });
      });
});