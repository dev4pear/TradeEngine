# Limit Order, Stop Loss and Take Profit Smart Contract System

Before any of the following, do not forget to configure hardhat.config.ts for the right network chainId and RPC Url. Also, the 4 accounts used in the Test sequences must be provided with the funds in each of the tokens used before the tests will work, if using the seed words in hardhat.config.ts:

```shell
0x72BA8429fE503E5EDbE8c0cB83F965AEC56CB539
0x42737f41673892dF1a5fE055283ca1158DAdCA63
0x9f141B7629d9ECF02eFF29E9c9B4467665c5C557
0x05874ec7c05aC8e4B06E5CE3De2aDBcb913fA3f3
```

## For BNB Smart Chain:

Extract to a folder and type 

```shell
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts
npx hardhat test test/engineTest.ts
```

## For Ethereum Chain:

Extract to a folder and type 

```shell
npm install
npx hardhat compile
npx hardhat run scripts/deployETH.ts
npx hardhat test test/engineTestETH.ts
```

## For Arbitrum Chain:

Extract to a folder and type 

```shell
npm install
npx hardhat compile
npx hardhat run scripts/deployARB.ts
npx hardhat test test/engineTestARB.ts
```