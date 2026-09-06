import { describe, expect, it, vi } from 'vitest';
import { ensureNetwork } from './ensureNetwork';

function setup(chainId = 1) {
  let current = chainId;
  const getSession = vi.fn(() => ({ address: '0x123', connectorId: 'wallet' }));
  const switchChain = vi.fn(async () => { current = 46630; });
  return { targetChainId: 46630, getSession, getChainId: async () => current, switchChain };
}
describe('Transaction network guard', () => {
  it('does not prompt when already on the target network', async () => {
    const options = setup(46630);
    await ensureNetwork(options);
    expect(options.switchChain).not.toHaveBeenCalled();
  });
  it('waits for switching before allowing the operation', async () => {
    const options = setup();
    await ensureNetwork(options);
    expect(options.switchChain).toHaveBeenCalledOnce();
    expect(await options.getChainId()).toBe(46630);
  });
  it('rejects when the user cancels switching', async () => {
    const options = setup();
    options.switchChain.mockRejectedValue(new Error('User rejected request'));
    await expect(ensureNetwork(options)).rejects.toThrow('User rejected');
  });
  it('rejects a switch that did not change the wallet network', async () => {
    const options = setup();
    options.switchChain.mockImplementation(async () => {});
    await expect(ensureNetwork(options)).rejects.toThrow('not completed');
  });
  it('rejects account changes while switching', async () => {
    const options = setup();
    options.getSession.mockReturnValueOnce({ address: '0x123', connectorId: 'wallet' });
    options.getSession.mockReturnValue({ address: '0x456', connectorId: 'wallet' });
    await expect(ensureNetwork(options)).rejects.toThrow('account changed');
  });
  it('requires a connected wallet', async () => {
    const options = setup();
    await expect(ensureNetwork({ ...options, getSession: () => ({}) })).rejects.toThrow('Connect your wallet');
    expect(options.switchChain).not.toHaveBeenCalled();
  });
});
