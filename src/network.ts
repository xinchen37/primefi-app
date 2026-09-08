import { robinhood as mainnet, robinhoodTestnet } from 'viem/chains';
import { appEnvironment } from './environment';

export function getRobinhoodChain(mode: string) {
  const testnet = ['dev', 'development', 'test'].includes(mode);
  if (!testnet && !['prod', 'production'].includes(mode)) {
    throw new Error(`Unsupported build mode: ${mode}. Use dev or prod.`);
  }
  return testnet ? robinhoodTestnet : { ...mainnet, testnet: false };
}

export const robinhood = getRobinhoodChain(appEnvironment);
