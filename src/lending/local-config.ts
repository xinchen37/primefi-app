import type { LendingAsset, LendingConfig } from './config';

// Public deployment configuration only. Never put private keys here.
// Define each token once per chain, then reuse it across pools.
// Optional displayDecimals controls UI quantities (default 2), NOT token decimals.
// Example: add displayDecimals: 6 to WETH to display six fractional digits.
const tokens = {
  USDG: { symbol: 'USDG', name: 'Global Dollar', iconSymbol: 'USDG', previewPath: '/markets/usdg', address: '0x6A3b175ea47fAc0eb6fcA79b673b3B4F1c099503', decimals: 6 },
  WETH: { symbol: 'WETH', name: 'Wrapped Ether', iconSymbol: 'ETH', previewPath: '/markets/eth', address: '0x199a20F205Ab26c5329C2B4C64Ed64cF85385D33', decimals: 18 },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA', iconSymbol: 'NVDA', previewPath: '/markets/nvda', address: '0x5B3207082E07E1894E909721f960B58CA0352CeA', decimals: 18 },
} satisfies Record<string, LendingAsset>;

// Addresses from deployment (1).json. No mainnet deployment is configured.
// Labels do not enable protocol isolation; risk parameters are read on-chain.
export const localLendingConfigs: Partial<Record<number, LendingConfig>> = {
  46630: {
    chainId: 46630,
    markets: [
      { id: 'stable', name: 'Stable Pool', pool: '0xE304A23Dc38a936086659598E935A8deDf2cc10C', oracle: '0x1EA69040EB15ED7B72536e80969e576D904Fb39D', assets: [tokens.USDG, tokens.WETH] },
      { id: 'stock', name: 'Stock Pool', pool: '0xE00b15153852F571585D91321EcC427266A1fa09', oracle: '0xB4D0f588B48D1eB8899345CE0E1110d8689894a1', assets: [tokens.USDG, tokens.NVDA] },
    ],
  },
};
