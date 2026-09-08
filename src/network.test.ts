import { describe, expect, it } from 'vitest';
import { getRobinhoodChain } from './network';

describe('Build network selection', () => {
  it('uses only testnet settings for dev builds', () => {
    const chain = getRobinhoodChain('dev');
    expect(chain.id).toBe(46630);
    expect(chain.testnet).toBe(true);
    expect(chain.contracts.multicall3.address).toBe('0xca11bde05977b3631167028862be2a173976ca11');
    expect(chain.rpcUrls.default.http[0]).toBe('https://rpc.testnet.chain.robinhood.com');
    expect(chain.blockExplorers.default.url).toBe('https://explorer.testnet.chain.robinhood.com');
  });
  it('uses mainnet settings for prod builds', () => {
    const chain = getRobinhoodChain('prod');
    expect(chain.id).toBe(4663);
    expect(chain.testnet).toBe(false);
    expect(chain.rpcUrls.default.http[0]).toBe('https://rpc.mainnet.chain.robinhood.com');
    expect(chain.blockExplorers.default.url).toBe('https://robinhoodchain.blockscout.com');
  });
  it('supports standard Vite modes without using the PROD boolean', () => {
    expect(getRobinhoodChain('development').id).toBe(46630);
    expect(getRobinhoodChain('production').id).toBe(4663);
  });
  it('rejects unknown modes instead of silently selecting mainnet', () => {
    expect(() => getRobinhoodChain('staging')).toThrow('Unsupported build mode');
  });
});
