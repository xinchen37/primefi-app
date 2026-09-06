interface WalletSession {
  address?: string;
  connectorId?: string;
}

export async function ensureNetwork({ targetChainId, getSession, getChainId, switchChain }: {
  targetChainId: number;
  getSession: () => WalletSession;
  getChainId: () => Promise<number>;
  switchChain: () => Promise<unknown>;
}) {
  const before = getSession();
  if (!before.address || !before.connectorId) throw new Error('Connect your wallet to continue.');
  if (await getChainId() !== targetChainId) await switchChain();
  const after = getSession();
  if (after.address !== before.address || after.connectorId !== before.connectorId) {
    throw new Error('Your wallet account changed. Review the operation and try again.');
  }
  if (await getChainId() !== targetChainId) throw new Error('Network switch was not completed. Please try again.');
}
