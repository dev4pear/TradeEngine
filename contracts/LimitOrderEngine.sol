// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

// This interface allows routing the amounts to trade toward PancakeSwap on BSC.
interface IPancakeRouter {
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
    external
    payable
    returns (uint[] memory amounts);
    function WETH() external pure returns (address);
}

contract TradingBot {
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

    IPancakeRouter public pancakeRouter;
    address public owner;
    uint public counter;

    // All active trades are contained as a TradeParams struct
    struct TradeParams {
        uint counter;
        address feed;
        address tokenIn;
        address tokenOut;
        uint amount;
        int takeProfit;
        int stopLoss;
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
    constructor(address _router, string[] memory symbols, address[] memory feeds, address[] memory token1, address[] memory token2) {
        pancakeRouter = IPancakeRouter(_router);
        owner = msg.sender;
        counter = 1;
        for (uint i=0; i < symbols.length; i++) {
            priceFeeds[feeds[i]] = Feed(symbols[i], AggregatorV3Interface(feeds[i]), token1[i], token2[i]);
        }
    }

    // Outdated function that I use to test native token (BNB) transfers. Note to self: need to handle BNB transfers in other functions.
    function swapNativeToToken(address tokenOut, uint amountOutMin) payable external {
        address[] memory path = new address[](2);
        path[0] = pancakeRouter.WETH();
        path[1] = tokenOut;

        pancakeRouter.swapExactETHForTokens{value: msg.value}(amountOutMin, path, msg.sender, block.timestamp + 300);
    } 

    // enterNewTrade is called by the UI when the user wants to move into an asset that he doesn't have in his wallet, trade on that asset and take profit or stop at a loss.
    function enterNewTrade(address feed, address tokenIn, address tokenOut, uint amountIn, uint amountOutMin, int takeProfit, int stopLoss) external {
        if (priceFeeds[feed].token1 == address(0)) revert TradingPairCurrentlyNotOffered("pairnotoffered");
        if (priceFeeds[feed].token1 != tokenOut || priceFeeds[feed].token2 != tokenIn) revert ContractCallProvidedWrongTokenPairOrPriceFeed("wrongpairtokens");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(pancakeRouter), amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        uint[] memory amounts = pancakeRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, address(this), block.timestamp + 300);      
        counter++;
        tradeOwners[counter] = msg.sender;
        emit TradeEntered(counter, tokenOut, tokenIn, amountIn, amounts[1], takeProfit, stopLoss);
        trades[counter] = TradeParams(counter, feed, tokenOut, tokenIn, amounts[1], takeProfit, stopLoss);
        tradesByOwner[msg.sender].push(counter);
    }
    // enterNewLimit is called by the UI when the user wants to purchase an asset at a future price, with an asset that he does have in his wallet.
    // From the perspective of a TradeParams struct, enterNewLimit opens the same kind of trade as enterNewTrade, but simply sets a stop loss (which is the equivalent of a Limit Buy)
    function enterNewLimit(address feed, address tokenIn, address tokenOut, uint amountIn, uint amountOutMin, int triggerPrice) external {
        if (priceFeeds[feed].token1 == address(0)) revert TradingPairCurrentlyNotOffered("pairnotoffered");
        if (priceFeeds[feed].token1 != tokenOut || priceFeeds[feed].token2 !=  tokenIn) revert ContractCallProvidedWrongTokenPairOrPriceFeed("wrongpairtokens");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        counter++;
        tradeOwners[counter] = msg.sender;
        emit TradeEntered(counter, tokenIn, tokenOut, amountIn, amountOutMin, 0, triggerPrice);
        trades[counter] = TradeParams(counter, feed, tokenIn, tokenOut, amountIn, 0, triggerPrice);
        tradesByOwner[msg.sender].push(counter);
    }

    // The function called by the UI when cancelling a trade that has not yet been executed.
    function cancelTrade(uint tradecounter) external {
        if (tradeOwners[tradecounter] == address(0)) revert TradeCounterDoesNotExist("counterdoesntexist");
        if (tradesByOwner[msg.sender].length == 0) revert WalletHasNoActiveTrades("no active trade");
        if (tradeOwners[tradecounter] != msg.sender) revert WalletDoesNotControlThisTrade("wallet doesnt control");
        IERC20(trades[tradecounter].tokenIn).approve(address(this), trades[tradecounter].amount);
        IERC20(trades[tradecounter].tokenIn).transferFrom(address(this), msg.sender, trades[tradecounter].amount);
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
        address[] memory path = new address[](2);
        path[0] = trades[tradecounter].tokenIn;
        path[1] = trades[tradecounter].tokenOut;

        IERC20(trades[tradecounter].tokenIn).approve(address(pancakeRouter), trades[tradecounter].amount);
        pancakeRouter.swapExactTokensForTokens(trades[tradecounter].amount, 10000, path, tradeOwners[tradecounter], block.timestamp + 300);

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