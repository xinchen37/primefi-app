import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { WagmiProvider } from "wagmi";
import { walletAdapter } from "./wallet";
import "./styles.css";
const client = new QueryClient();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={walletAdapter.wagmiConfig}>
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
