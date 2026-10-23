import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  networks: {
    baseSepolia: {
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
      chainId: 84_532,
      chainType: "l1",
      type: "http",
      url: configVariable("BASE_SEPOLIA_RPC_URL"),
    },
    hardhat: {
      chainId: 31_337,
      chainType: "l1",
      type: "edr-simulated",
    },
    localhost: {
      chainType: "l1",
      type: "http",
      url: "http://127.0.0.1:8545",
    },
  },
  paths: {
    sources: "src",
  },
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        settings: {
          evmVersion: "cancun",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
        version: "0.8.28",
      },
    },
  },
});
