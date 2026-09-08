import { defineChain } from 'viem';
import { appEnvironment, environmentChainIds } from './environment';

export function getRobinhoodChain(mode: string, rpcOverride?: string) {
  const testnet = ['dev', 'development', 'test'].includes(mode);
  if (!testnet && !['prod', 'production'].includes(mode)) {
    throw new Error(`Unsupported build mode: ${mode}. Use dev or prod.`);
  }
  return defineChain({
    id: environmentChainIds[testnet ? 'dev' : 'prod'],
    name: testnet ? 'Robinhood Chain Testnet' : 'Robinhood Chain',
    testnet,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcOverride || (testnet
      ? 'https://rpc.testnet.chain.robinhood.com'
      : 'https://rpc.mainnet.chain.robinhood.com')] } },
    blockExplorers: { default: { name: 'Blockscout', url: testnet
      ? 'https://explorer.testnet.chain.robinhood.com'
      : 'https://robinhoodchain.blockscout.com' } },
  });
}

export const robinhood = getRobinhoodChain(appEnvironment, import.meta.env.VITE_ROBINHOOD_RPC_URL);
