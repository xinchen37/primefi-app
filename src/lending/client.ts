import { createPublicClient, http, BaseError } from 'viem';
import { getAccount, getWalletClient } from 'wagmi/actions';
import type { Config } from 'wagmi';
import { robinhood } from '../network';
import type { LendingIO } from './service';

export const lendingClient = createPublicClient({ chain: robinhood, transport: http(robinhood.rpcUrls.default.http[0], { timeout: 15_000, retryCount: 1 }) });
export function lendingError(error: unknown) {
  return error instanceof BaseError ? error.shortMessage : error instanceof Error ? error.message : 'Unable to complete the request.';
}
export function createLendingIO(config: Config): LendingIO {
  const session: LendingIO['session'] = async () => {
    const a = getAccount(config);
    if (!a.address || !a.connector) throw new Error('Connect your wallet to continue.');
    const chainId = await a.connector.getChainId();
    const wallet = await getWalletClient(config, { connector: a.connector, chainId });
    const addresses = await wallet.getAddresses();
    if (addresses[0]?.toLowerCase() !== a.address.toLowerCase()) throw new Error('Wallet account changed. Reconnect and try again.');
    return { address: a.address, chainId, connector: a.connector.uid };
  };
  return {
    read: call => lendingClient.readContract(call),
    session,
    send: async call => {
      const before = await session();
      if (before.chainId !== robinhood.id) throw new Error('Switch to the configured network.');
      if (await lendingClient.getChainId() !== robinhood.id) throw new Error('RPC network does not match the configured chain.');
      const { request } = await lendingClient.simulateContract({ ...call, account: before.address });
      const after = await session();
      if (before.address !== after.address || before.chainId !== after.chainId || before.connector !== after.connector) throw new Error('Wallet changed during simulation.');
      const wallet = await getWalletClient(config, { chainId: robinhood.id });
      return wallet.writeContract({ ...request, account: before.address, chain: robinhood });
    },
    wait: async hash => {
      let cancelled = false;
      const receipt = await lendingClient.waitForTransactionReceipt({ hash, timeout: 180_000, onReplaced: replacement => { cancelled = replacement.reason !== 'repriced'; } });
      return { status: cancelled ? 'cancelled' : receipt.status, transactionHash: receipt.transactionHash };
    },
  };
}
