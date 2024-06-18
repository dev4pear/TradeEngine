import { HardhatUserConfig } from "hardhat/config";
import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  defaultNetwork: "buildbear",
  networks: {
    hardhat: {},
    buildbear: {
      //url: "https://rpc.buildbear.io/imaginative-sunfire-56e78271", // Buildbear BSC testnet
      //url: "https://rpc.buildbear.io/civic-namor-48781233", //Buildbear ETH testnet
      url: "https://rpc.buildbear.io/evil-ronan-ac51e8c0", //Buildbear ARB testnet
      accounts: {
        mnemonic:
          "spawn grab travel cake salute economy dice cream destroy rapid hockey feed",
      },
      //chainId: 16766 // Buildbear BSC testnet
      //chainId: 16876 // BuildBear ETH testnet
      chainId: 16904, // BuildBear ARB testnet
    },
    bnbchain: {
      url: "https://bsc.drpc.org",
      accounts: {
        mnemonic:
          "",
      },
      chainId: 56,
    },

    ethereum: {
      url: "https://eth.llamarpc.com",
      accounts: {
        mnemonic:
          "",
      },
      chainId: 1,
    },

    arbitrum: {
      url: "https://1rpc.io/arb",
      accounts: {
        mnemonic:
          "",
      },
      chainId: 42161,
    },

    localhost: {
      url: "https://localhost:8545",
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: "E8NV6NUMU1SDFXSE1Y9DECSCT1SI2HRA31",
      bsc: "MYAYR6KJQT1CVTDH8IGA43FKP4BS3UG589",
      arbitrumOne: "AKXT99EB5UFGGUG3EAN5NEVYR1QYWF9GD1",
    },
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://repo.sourcify.dev",
  },
};

export default config;
