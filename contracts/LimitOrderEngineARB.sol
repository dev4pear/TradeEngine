// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import '@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract TradingBotARB {
    // These events can be supervised by an off-chain bot that can activate the trades when they their trigger/takeprofit/stoploss qualifies.
    event TradeExecuted(uint counter);
    event TradeEntered(uint counter, address indexed tokenIn, address indexed tokenOut, uint amountIn, uint resultAmountOut, int takeProfit, int stopLoss);
    event TradeCanceled(uint counter);
    event ErrorLog(string message);

    error OnlyTheOwnerCanRunFunction(string message);
    error WalletDoesNotControlThisTrade(string message);
    error WalletHasNoActiveTrades(string message);
    error TradeCounterDoesNotExist(string message);
    error PriceStillWithinStopLossTakeProfitRange(string message);
    error LimitPriceHasNotBeenAttained(string message);
    error TradingPairCurrentlyNotOffered(string message);
    error ContractCallProvidedWrongTokenPairOrPriceFeed(string message);
    error SwapRouterReturnedNoTokens(string message);

    ISwapRouter public immutable swapRouter;
    address public immutable weth;
    address public owner;
    uint public counter;
    uint24 public constant poolFee = 3000;

    // All active trades are contained as a TradeParams struct
    struct TradeParams {
        uint counter;
        address feed;
        address tokenIn;
        address tokenOut;
        uint amount;
        int takeProfit;
        int stopLoss;
        bool invertSwap;
    }
    
    // All approved feeds from ChainLink are recorded in a Feed struct
    struct Feed {
        string symbol;
        AggregatorV3Interface feedInterface;
        address token1;
        address token2;
    }

    // Mappings allow for the management of all trades of a given owner, as well as price feeds.
    mapping(uint => TradeParams) public trades;
    mapping(uint => address) public tradeOwners;
    mapping(address => uint[]) public tradesByOwner;
    mapping(address => Feed) internal priceFeeds;

    // Functions that can only be executed by the owner might at some point be practical for security, although for now they are not set up.
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyTheOwnerCanRunFunction("onlyowner");
        _;
    }

    // The constructor initalizes the contract with arrays containing information on all approved pairs (high volume pairs that have a ChainLink feed on BSC)
    constructor(ISwapRouter _router, string[] memory symbols, address[] memory feeds, address[] memory token1, address[] memory token2) {
        swapRouter = _router;
        weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
        owner = msg.sender;
        counter = 1;
        for (uint i=0; i < symbols.length; i++) {
            priceFeeds[feeds[i]] = Feed(symbols[i], AggregatorV3Interface(feeds[i]), token1[i], token2[i]);
        }
    }

    // Outdated function that I use to test native token (BNB) transfers. Note to self: need to handle BNB transfers in other functions.
    function swapNativeToToken(address tokenOut, uint amountOutMin) payable external {
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: weth,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: msg.value,
                amountOutMinimum: amountOutMin,
                sqrtPriceLimitX96: 0
            });
        swapRouter.exactInputSingle{value: msg.value}(params);
    } 

    // enterNewTrade is called by the UI when the user wants to move into an asset that he doesn't have in his wallet, trade on that asset and take profit or stop at a loss.
    function enterNewTrade(address feed, address tokenIn, address tokenOut, uint amountIn, uint amountOutMin, int takeProfit, int stopLoss, bool invertSwap) external {
        if (priceFeeds[feed].token1 == address(0)) revert TradingPairCurrentlyNotOffered("pairnotoffered");
        if (invertSwap) {
            if (priceFeeds[feed].token1 != tokenIn || priceFeeds[feed].token2 != tokenOut) revert ContractCallProvidedWrongTokenPairOrPriceFeed("wrongpairtokens");
        } else {
            if (priceFeeds[feed].token1 != tokenOut || priceFeeds[feed].token2 != tokenIn) revert ContractCallProvidedWrongTokenPairOrPriceFeed("wrongpairtokens");
        }
        TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(tokenIn, poolFee, tokenOut),
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin
            });

        uint amounts = swapRouter.exactInput(params);
        if (amounts == 0) revert SwapRouterReturnedNoTokens("no tokens returned");
        counter++;
        tradeOwners[counter] = msg.sender;
        emit TradeEntered(counter, tokenOut, tokenIn, amountIn, amounts, takeProfit, stopLoss);
        trades[counter] = TradeParams(counter, feed, tokenOut, tokenIn, amounts, takeProfit, stopLoss, invertSwap);
        tradesByOwner[msg.sender].push(counter);
    }
    // enterNewLimit is called by the UI when the user wants to purchase an asset at a future price, with an asset that he does have in his wallet.
    // From the perspective of a TradeParams struct, enterNewLimit opens the same kind of trade as enterNewTrade, but simply sets a stop loss (which is the equivalent of a Limit Buy)
    function enterNewLimit(address feed, address tokenIn, address tokenOut, uint amountIn, uint amountOutMin, int triggerPrice, bool invertSwap) external {
        if (priceFeeds[feed].token1 == address(0)) revert TradingPairCurrentlyNotOffered("pairnotoffered");
        if (invertSwap) {
            if (priceFeeds[feed].token1 != tokenIn || priceFeeds[feed].token2 != tokenOut) revert ContractCallProvidedWrongTokenPairOrPriceFeed("wrongpairtokens");
        } else {
            if (priceFeeds[feed].token1 != tokenOut || priceFeeds[feed].token2 !=  tokenIn) revert ContractCallProvidedWrongTokenPairOrPriceFeed("wrongpairtokens");
        }
        TransferHelper.safeTransferFrom(tokenIn, msg.sender,address(this), amountIn);
        counter++;
        tradeOwners[counter] = msg.sender;
        emit TradeEntered(counter, tokenIn, tokenOut, amountIn, amountOutMin, 0, triggerPrice);
        trades[counter] = TradeParams(counter, feed, tokenIn, tokenOut, amountIn, 0, triggerPrice, invertSwap);
        tradesByOwner[msg.sender].push(counter);
    }

    // The function called by the UI when cancelling a trade that has not yet been executed.
    function cancelTrade(uint tradecounter) external {
        if (tradeOwners[tradecounter] == address(0)) revert TradeCounterDoesNotExist("counterdoesntexist");
        if (tradesByOwner[msg.sender].length == 0) revert WalletHasNoActiveTrades("no active trade");
        if (tradeOwners[tradecounter] != msg.sender) revert WalletDoesNotControlThisTrade("wallet doesnt control");

        TransferHelper.safeApprove(trades[tradecounter].tokenIn, address(this), trades[tradecounter].amount);
        TransferHelper.safeTransferFrom(trades[tradecounter].tokenIn, address(this), msg.sender, trades[tradecounter].amount);
        
        emit TradeCanceled(tradecounter);
        for (uint i=0; i < tradesByOwner[msg.sender].length; i++) {
            if (tradesByOwner[msg.sender][i] == tradecounter) {
                tradesByOwner[msg.sender][i] = tradesByOwner[msg.sender][tradesByOwner[msg.sender].length - 1] ;
                tradesByOwner[msg.sender].pop();
                break;
            }
        }
        delete trades[tradecounter];
        delete tradeOwners[tradecounter];
    }

    // We give the UI access to latest price information for any given ffed documented in PairsAndFeeds.json
    function getChainlinkDataFeedLatestAnswer(address feed) public view returns (int) {
        ( /* uint80 roundID */, int answer, /*uint startedAt*/, /*uint timeStamp*/, /*uint80 answeredInRound*/ ) = priceFeeds[feed].feedInterface.latestRoundData();
        return answer;
    }

    // ExecuteTrade can be called by anyone (say, a supervisor bot), but will only complete if the conditions of TradeParams are met for a given trade.
    function executeTrade(uint tradecounter) external {
        if (tradesByOwner[tradeOwners[tradecounter]].length == 0) revert WalletHasNoActiveTrades("no active trade");
        ( /* uint80 roundID */, int answer, /*uint startedAt*/, /*uint timeStamp*/, /*uint80 answeredInRound*/ ) = priceFeeds[trades[tradecounter].feed].feedInterface.latestRoundData();
        if (trades[tradecounter].takeProfit != 0) { 
            if (trades[tradecounter].takeProfit > answer && trades[tradecounter].stopLoss < answer) revert PriceStillWithinStopLossTakeProfitRange("withinrange");
        } else {
            if (trades[tradecounter].stopLoss < answer) revert LimitPriceHasNotBeenAttained("limitnotreached");
        }

        TransferHelper.safeApprove(trades[tradecounter].tokenIn, address(swapRouter), trades[tradecounter].amount);
        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(trades[tradecounter].tokenIn, poolFee, trades[tradecounter].tokenOut),
                recipient: tradeOwners[tradecounter],
                deadline: block.timestamp,
                amountIn: trades[tradecounter].amount,
                amountOutMinimum: 0
            });

        swapRouter.exactInput(params);

        emit TradeExecuted(trades[tradecounter].counter);
        for (uint i=0; i < tradesByOwner[tradeOwners[tradecounter]].length; i++) {
            if (tradesByOwner[tradeOwners[tradecounter]][i] == tradecounter) {
                tradesByOwner[tradeOwners[tradecounter]][i] = tradesByOwner[tradeOwners[tradecounter]][tradesByOwner[tradeOwners[tradecounter]].length - 1] ;
                tradesByOwner[tradeOwners[tradecounter]].pop();
                break;
            }
        }
        delete trades[tradecounter];
        delete tradeOwners[tradecounter];
    }

    // The UI can use this function to know all trades that are active for a given wallet.
    function getCurrentTrades() public view returns (uint[] memory) {
        return tradesByOwner[msg.sender];
    }
}