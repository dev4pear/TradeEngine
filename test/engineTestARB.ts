import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, Contract } from "ethers";
import dotenv from "dotenv";
import * as fs from "node:fs";

dotenv.config();
const minABI = [ { constant: true, inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256'}], type: 'function', },];
const TradingBotJson = fs.readFileSync("./artifacts/contracts/LimitOrderEngineARB.sol/TradingBotARB.json");
const IERC20Json = fs.readFileSync("./artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json");
const PairsAndFeedsJson = JSON.parse(fs.readFileSync("./PairsAndFeedsARB.json").toString());
const TradingBotAddress = process.env.TRADINGBOT!;
//const USDCAddress = PairsAndFeedsJson[9].asset2; // Those are the right array numbers to get those addresses in PairsAndFeedsBSC.json
//const BTCAddress = PairsAndFeedsJson[9].asset1;
//const BTCUSDCFeed = PairsAndFeedsJson[9].feed;
//const ETHAddress = PairsAndFeedsJson[8].asset2;
//const BTCETHFeed = PairsAndFeedsJson[8].feed;
//const USDCAddress = PairsAndFeedsJson[6].asset2; // Those are the right array numbers to get those addresses in PairsAndFeedsETH.json
//const BTCAddress = PairsAndFeedsJson[6].asset1;
//const BTCUSDCFeed = PairsAndFeedsJson[6].feed;
//const BTCUSDCMATICAddress = PairsAndFeedsJson[14].asset2;
//const MATICUSDCFeed = PairsAndFeedsJson[14].feed;
//const MATICAddress = PairsAndFeedsJson[14].asset1;
const USDCAddress = PairsAndFeedsJson[6].asset2; // Those are the right array numbers to get those addresses in PairsAndFeedsARB.json
const BTCAddress = PairsAndFeedsJson[6].asset1;
const BTCUSDCFeed = PairsAndFeedsJson[6].feed;
const BTCUSDCMATICAddress = PairsAndFeedsJson[7].asset2;
const MATICUSDCFeed = PairsAndFeedsJson[7].feed;
const MATICAddress = PairsAndFeedsJson[7].asset1;
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
      
         it("Should buy some MATIC from Uniswap using Native Token (ETH) and Uniswap Router", async function () {
          const initialBalance = await MATICContract.balanceOf(owner);
          const tx = await TradingBotContract.swapNativeToToken.send(MATICAddress,10000,{value: ethers.parseEther("0.5")});
          tx.wait();
          const newBalance = await MATICContract.balanceOf(owner);
          expect(newBalance).to.be.greaterThan(initialBalance);
        });

        it("Should buy some USDC from Uniswap using Native Token (ETH) and Uniswap Router", async function () {
          const initialBalance = await USDCContract.balanceOf(owner);
          const tx = await TradingBotContract.swapNativeToToken.send(USDCAddress,10000,{value: ethers.parseEther("5")});
          tx.wait();
          const newBalance = await USDCContract.balanceOf(owner);
          expect(newBalance).to.be.greaterThan(initialBalance);
        });

        it("Should retrieve price feed data from Chainlink", async function () {
          const response = await TradingBotContract.getChainlinkDataFeedLatestAnswer.staticCall(BTCUSDCFeed);
          expect(response).to.be.a('bigint');
        });

        it("Should place a trade buying BTCB with 500 USDC, with Stop Loss and Take Profits Exiting back to USDC", async function () {
          const initialBalance = await USDCContract.balanceOf(owner);
          const resp = await IERC20Contract.approve(TradingBotContract.getAddress(), (500n)*PRECISION);
          const tx = await TradingBotContract.enterNewTrade.send(BTCUSDCFeed, USDCAddress, BTCAddress, (500n)*PRECISION, 1, 6786775261845, 6186775261845, false);
          tx.wait();
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          expect(response2[0]).to.be.a('bigint');
        });
 
        it("Should accept to cancel that trade", async function () {
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');
          const tx = await TradingBotContract.cancelTrade.send(response2[response2.length - 1]);
          tx.wait();
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength - 1);
        });
 
        it("Should place a trade buying BTCB with 500 USDC with qualifying TakeProfit to USDC and execute that trade.", async function () {
          const initialBalance = await USDCContract.balanceOf(owner);
          const resp = await IERC20Contract.approve(TradingBotContract.getAddress(), (500n)*PRECISION);
          const tx = await TradingBotContract.enterNewTrade.send(BTCUSDCFeed, USDCAddress, BTCAddress, (500n)*PRECISION, 10000, 6386775261845, 6186775261845, false);
          tx.wait();
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');
          const newBalance = await USDCContract.balanceOf(owner);
          expect(newBalance).to.be.lessThan(initialBalance);
          
          const tx2 = await TradingBotContract.executeTrade.send(response2[response2.length - 1]);
          tx2.wait();
    
          const finalBalance = await USDCContract.balanceOf(owner);
          expect(finalBalance).to.be.greaterThan(newBalance);
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength - 1);
        });

        it("Should place a limit order with 500 USDC to buy BTCB", async function () {
          const initialBalance = await USDCContract.balanceOf(owner);
          const resp = await IERC20Contract.approve(TradingBotContract.getAddress(), (500n)*PRECISION);
          const tx = await TradingBotContract.enterNewLimit.send(BTCUSDCFeed, USDCAddress, BTCAddress, (500n)*PRECISION, 10000, 6186775261845, false);
          tx.wait();
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          expect(response2[response2.length - 1]).to.be.a('bigint');
        });

        it("Should accept to cancel that limit order", async function () {
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');
          const tx = await TradingBotContract.cancelTrade.send(response2[response2.length - 1]);
          tx.wait();
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength - 1);
        });

        it("Should place a limit order with 500 USDC with qualifying trigger and execute that trade.", async function () {
          const initialBalance = await USDCContract.balanceOf(owner);
          const initialBTCBalance = await BTCBContract.balanceOf(owner);
          const resp = await IERC20Contract.approve(TradingBotContract.getAddress(), (500n)*PRECISION);
          const tx = await TradingBotContract.enterNewLimit.send(BTCUSDCFeed, USDCAddress, BTCAddress, (500n)*PRECISION, 10000, 6586775261845, false);
          tx.wait();
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');
          const newBalance = await USDCContract.balanceOf(owner);
          expect(newBalance).to.be.lessThan(initialBalance);
          const tx2 = await TradingBotContract.executeTrade.send(response2[response2.length - 1]);
          tx2.wait();
    
          const finalBTCBalance = await BTCBContract.balanceOf(owner);
          expect(finalBTCBalance).to.be.greaterThan(initialBTCBalance);
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength - 1);
         }); 
 
      });
 
  
      describe("Multiple Wallets and Transactions", function () {
       
        it("Should generate an error when a wallet tries to cancel a trade while having no trades registered", async function () {
          const response2 = await TradingBotContract4.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2.length).to.equal(0);

          await expect(TradingBotContract4.cancelTrade.send(BigInt(2))).to.be.revertedWithCustomError(TradingBotContract4, "TradeCounterDoesNotExist");
          const response3 = await TradingBotContract4.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength);
        });

        it("Should place 500 USDC trade with Account 1", async function () {
          const initialBalance = await USDCContract.balanceOf(owner);
          const resp = await IERC20Contract.approve(TradingBotContract.getAddress(), 500n*PRECISION);
          const tx = await TradingBotContract.enterNewTrade.send(BTCUSDCFeed, USDCAddress, BTCAddress, 500n*PRECISION, 10000, 6786775261845, 6186775261845, false);
          tx.wait();
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          expect(response2[response2.length - 1]).to.be.a('bigint');
        });

        it("Should place 500 USDC trade with Account 2", async function () {
          const initialBalance2 = await USDCContract2.balanceOf(otherAccount);
          const resp2 = await IERC20Contract2.approve(TradingBotContract2.getAddress(), 500n*PRECISION);
          const tx2 = await TradingBotContract2.enterNewTrade.send(BTCUSDCFeed, USDCAddress, BTCAddress, 500n*PRECISION, 10000, 6786775261845, 6186775261845, false);
          tx2.wait();
          const response_2 = await TradingBotContract2.getCurrentTrades.staticCall();
          expect(response_2[response_2.length - 1]).to.be.a('bigint');
        });

        it("Should place 500 USDC trade with Account 3", async function () {
          const initialBalance3 = await USDCContract3.balanceOf(otherAccount2);
          const resp3 = await IERC20Contract3.approve(TradingBotContract3.getAddress(), 500n*PRECISION);
          const tx3 = await TradingBotContract3.enterNewTrade.send(BTCUSDCFeed, USDCAddress, BTCAddress, 500n*PRECISION, 10000, 6786775261845, 6186775261845, false);
          tx3.wait();
          const response3 = await TradingBotContract3.getCurrentTrades.staticCall();
          expect(response3[response3.length - 1]).to.be.a('bigint');
        });
        

        it("Should refuse to cancel a trade when wrong account requests cancelation", async function () {
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');

          await expect(TradingBotContract2.cancelTrade.send(response2[response2.length - 1])).to.be.revertedWithCustomError(TradingBotContract2, "WalletDoesNotControlThisTrade");
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength);
        });

        it("Should refuse to cancel a trade that doesn't exist", async function () {
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');

          await expect(TradingBotContract.cancelTrade.send(438934982)).to.be.revertedWithCustomError(TradingBotContract, "TradeCounterDoesNotExist");
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength);
        });

        it("Should refuse to execute a trade when the prices of Stop Loss and Take Profits have not been attained", async function () {
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');
          const initialBalance = await USDCContract2.balanceOf(otherAccount);
          await expect(TradingBotContract.executeTrade.send(response2[response2.length - 1])).to.be.revertedWithCustomError(TradingBotContract2, "PriceStillWithinStopLossTakeProfitRange");
    
          const finalBalance = await USDCContract2.balanceOf(otherAccount);
          expect(finalBalance).to.be.equal(initialBalance);
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength);
        });

        it("Should place a limit order and refuse to execute this limit order when the trigger price has not been attained.", async function () {
          const initialBalance = await USDCContract.balanceOf(owner);
          const initialBTCBalance = await BTCBContract.balanceOf(owner);
          const resp = await IERC20Contract.approve(TradingBotContract.getAddress(), 500n*PRECISION);
          const tx = await TradingBotContract.enterNewLimit.send(BTCUSDCFeed, USDCAddress, BTCAddress, 500n*PRECISION, 10000, 6186775261845, false);
          tx.wait();
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');
          const newBalance = await USDCContract.balanceOf(owner);
          expect(newBalance).to.be.lessThan(initialBalance);
          await expect(TradingBotContract.executeTrade.send(response2[response2.length - 1])).to.be.revertedWithCustomError(TradingBotContract, "LimitPriceHasNotBeenAttained");
    
          const finalBTCBalance = await BTCBContract.balanceOf(owner);
          expect(finalBTCBalance).to.be.equal(initialBTCBalance);
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength);

        });
      });
 
      describe("Transactions with different pairs", function () {
      
        it("Should retrieve price feed data from Chainlink for DAI/USDC", async function () {
          const response = await TradingBotContract.getChainlinkDataFeedLatestAnswer.staticCall(MATICUSDCFeed);
          expect(response).to.be.a('bigint');
        });

        it("Should place a trade swapping to USDC with 100 DAI, with Stop Loss and Take Profits Exiting back to USDC", async function () {
          const initialBalance = await MATICContract.balanceOf(owner);
          const resp = await IERC20MATICContract.approve(TradingBotContract.getAddress(), 100n*PRECISIONMATIC);
          const tx = await TradingBotContract.enterNewTrade.send(MATICUSDCFeed, MATICAddress, BTCUSDCMATICAddress, 100n*PRECISIONMATIC,10000, 6786775261845, 6186775261845, true);
          tx.wait();
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          expect(response2[0]).to.be.a('bigint');
        });

        it("Should accept to cancel that trade", async function () {
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');
          const tx = await TradingBotContract.cancelTrade.send(response2[response2.length - 1]);
          tx.wait();
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength - 1);
        });

        it("Should place a trade swapping to USDC with 100 DAI, with qualifying TakeProfit to USDC and execute that trade.", async function () {
          const initialBalance = await MATICContract.balanceOf(owner);
          const resp = await IERC20MATICContract.approve(TradingBotContract.getAddress(), 100n*PRECISIONMATIC);
          const tx = await TradingBotContract.enterNewTrade.send(MATICUSDCFeed, MATICAddress, BTCUSDCMATICAddress, 100n*PRECISIONMATIC, 10000, 6386775261845, 6186775261845, true);
          tx.wait();
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');
          const newBalance = await MATICContract.balanceOf(owner);
          expect(newBalance).to.be.lessThan(initialBalance);
          
          const tx2 = await TradingBotContract.executeTrade.send(response2[response2.length - 1]);
          tx2.wait();
    
          const finalBalance = await MATICContract.balanceOf(owner);
          expect(finalBalance).to.be.greaterThan(newBalance);
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength - 1);
        });

        it("Should place a limit order with 100 DAI to USDC", async function () {
          const initialBalance = await MATICContract.balanceOf(owner);
          const resp = await IERC20MATICContract.approve(TradingBotContract.getAddress(), 100n*PRECISIONMATIC);
          const tx = await TradingBotContract.enterNewLimit.send(MATICUSDCFeed, MATICAddress, BTCUSDCMATICAddress, 100n*PRECISIONMATIC, 10000, 6186775261845, true);
          tx.wait();
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          expect(response2[response2.length - 1]).to.be.a('bigint');
        });

        it("Should accept to cancel that limit order", async function () {
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');
          const tx = await TradingBotContract.cancelTrade.send(response2[response2.length - 1]);
          tx.wait();
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength - 1);
        });

        it("Should place a limit order with 100 DAI with qualifying trigger and execute that trade.", async function () {
          const initialBalance = await MATICContract.balanceOf(owner);
          const initialBTCBalance = await USDCContract.balanceOf(owner);
          const resp = await IERC20MATICContract.approve(TradingBotContract.getAddress(), 100n*PRECISIONMATIC);
          const tx = await TradingBotContract.enterNewLimit.send(MATICUSDCFeed, MATICAddress, BTCUSDCMATICAddress, 100n*PRECISIONMATIC, 10000, 21911481786026600000n, true);
          tx.wait();
          const response2 = await TradingBotContract.getCurrentTrades.staticCall();
          const initialLength = response2.length;
          expect(response2[response2.length - 1]).to.be.a('bigint');
          const newBalance = await MATICContract.balanceOf(owner);
          expect(newBalance).to.be.lessThan(initialBalance);
          const tx2 = await TradingBotContract.executeTrade.send(response2[response2.length - 1]);
          tx2.wait();
    
          const finalBTCBalance = await USDCContract.balanceOf(owner);
          expect(finalBTCBalance).to.be.greaterThan(initialBTCBalance);
          const response3 = await TradingBotContract.getCurrentTrades.staticCall();
          const newLength = response3.length;
          expect(newLength).to.equal(initialLength - 1);
         });

         it("Should refuse to place a trade when a feed address from unapproved pair is attempted", async function () {
          const initialBalance = await MATICContract.balanceOf(owner);
          const resp = await IERC20MATICContract.approve(TradingBotContract.getAddress(), 100n*PRECISIONMATIC);
          expect(TradingBotContract.enterNewTrade.send("0xb7Ed5bE7977d61E83534230f3256C021e0fae0B6", MATICAddress, BTCUSDCMATICAddress, 100n*PRECISIONMATIC, 10000, 6786775261845, 6186775261845, true)).to.be.revertedWithCustomError(TradingBotContract, "TradingPairCurrentlyNotOffered");
        });

        it("Should refuse to place a trade when the wrong tokens are provided alongisde the feed address", async function () {
          await new Promise(resolve => setTimeout(resolve, 3000));
          expect(TradingBotContract.enterNewTrade.send(MATICUSDCFeed, BTCUSDCMATICAddress, BTCUSDCMATICAddress, 100n*PRECISIONMATIC, 10000, 6786775261845, 6186775261845, true)).to.be.revertedWithCustomError(TradingBotContract, "ContractCallProvidedWrongTokenPairOrPriceFeed");
        }); 
      }); 
});