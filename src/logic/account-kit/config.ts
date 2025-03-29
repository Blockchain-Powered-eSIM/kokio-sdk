import { createConfig } from "@account-kit/core";
import { alchemy } from "@account-kit/infra";
import { sepolia, mainnet, optimism, optimismSepolia, arbitrum, arbitrumSepolia } from "viem/chains";

export const config = createConfig({
  transport: alchemy({ apiKey: "VxSGeL7F1vaQ0_T3IrVTYCuOv086a9Gi" }),
  chain: optimismSepolia, //default chain
  chains: [
    {
        chain: mainnet,
        // policyId: ""
    },
    {
        chain: sepolia,
        // policyId: ""
    },
    {
        chain: optimism,
        // policyId: ""
    },
    {
        chain: optimismSepolia,
        // policyId: ""
    },
    {
        chain: arbitrum,
        // policyId: ""
    },{
        chain: arbitrumSepolia,
        // policyId: ""
    },
  ],
});

// Chain can be changed using setChain function, eg. await setChain(config, mainnet);