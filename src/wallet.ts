import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { http } from "viem";
import { robinhood } from './network';
export { robinhood } from './network';
import robinhoodIcon from './images/icon/robinhood.png';

// Public client identifier, not a secret. Override per deployment if needed.
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;
if (!projectId)
  throw new Error("Set VITE_REOWN_PROJECT_ID to enable wallet connections.");
export const walletAdapter = new WagmiAdapter({
  projectId,
  networks: [robinhood],
  transports: { [robinhood.id]: http(robinhood.rpcUrls.default.http[0]) },
});
// Initialize once outside React. AppKit owns the connection modal and session.
export const walletModal = createAppKit({
  adapters: [walletAdapter],
  networks: [robinhood],
  defaultNetwork: robinhood,
  chainImages: { [robinhood.id]: new URL(robinhoodIcon, window.location.origin).href },
  projectId,
  metadata: {
    name: "Orbit",
    description: `Multi-asset lending on ${robinhood.name}`,
    url: window.location.origin,
    icons: [`${window.location.origin}/orbit.svg`],
  },
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#8a63c3",
    "--w3m-border-radius-master": "2px",
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
    send: false,
    receive: false,
    history: false,
  },
  enableWalletGuide: false,
});
