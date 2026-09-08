import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useMatch,
  useParams,
} from "react-router-dom";
import { useAccount, useConfig, useSwitchChain } from "wagmi";
import { getAccount } from 'wagmi/actions';
import { ensureNetwork } from './ensureNetwork';
import { useAppKit } from "@reown/appkit/react";
import { robinhood } from "./wallet";
import {
  ArrowUpRight,
  CircleHelp,
  Layers3,
  Wallet,
  X,
  CheckCircle2,
} from "lucide-react";
import LendingDashboard from './lending/LendingDashboard';
import robinhoodIcon from './images/icon/robinhood.png';
import LendingMarkets from './lending/LendingMarkets';
import { isIsolatedMarket, marketPath, reservePath } from './lending/marketSelection';
import { Modal } from "./components";
function LegacyReserve() {
  const { symbol = '' } = useParams();
  return <Navigate to={reservePath(symbol, true)} replace />;
}
export default function App() {
  const { pathname, search } = useLocation();
  const isolatedCategory = isIsolatedMarket(search);
  const dashboardMatch = useMatch("/dashboard");
  const marketsMatch = useMatch("/markets");
  const reserveMatch = useMatch("/markets/:symbol");
  const isolatedMatch = useMatch('/markets/isolated/:symbol');
  const isolatedDashboardMatch = useMatch('/dashboard/isolated/:symbol');
  const isolatedTitle = isolatedMatch?.params.symbol || isolatedDashboardMatch?.params.symbol;
  const reserveTitle = reserveMatch?.params.symbol?.toUpperCase();
  const page = dashboardMatch ? "dashboard" : marketsMatch ? "markets" : null;
  const { address, isConnected, isConnecting, isReconnecting } =
    useAccount();
  const { open } = useAppKit();
  const { switchChainAsync } = useSwitchChain();
  const config = useConfig();
  const [help, setHelp] = useState(false),
    [toast, setToast] = useState("");
  useEffect(() => {
    document.title = `${isolatedTitle ? `${isolatedTitle} / USDG` : reserveTitle || (page === "dashboard" ? "Dashboard" : page === "markets" ? "Markets" : "Page not found")} · Orbit`;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setHelp(false);
    setToast("");
  }, [pathname, search, page, reserveTitle, isolatedTitle]);
  async function showWallet() {
    try {
      await open({ view: isConnected ? "Account" : "Connect" });
    } catch {
      setToast(
        "Unable to open wallet connection. Check your connection and try again.",
      );
    }
  }
  async function beforeTransaction() {
    const connector = getAccount(config).connector;
    if (!connector) throw new Error('Connect your wallet to continue.');
    try {
      await ensureNetwork({
        targetChainId: robinhood.id,
        getSession: () => { const a = getAccount(config); return { address: a.address, connectorId: a.connector?.uid }; },
        getChainId: () => connector.getChainId(),
        switchChain: () => switchChainAsync({ chainId: robinhood.id, connector }),
      });
    } catch {
      throw new Error('Unable to continue. Confirm the network switch in your wallet and keep the same account connected.');
    }
  }
  return (
    <div className="app-shell">
      <header className="header">
        <Link className="brand" to={marketPath('/dashboard', isolatedCategory)} aria-label="Orbit home">
          <span className="brand-orbit" />
          orbit
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to={marketPath('/dashboard', isolatedCategory)}>
            Dashboard
          </NavLink>
          <NavLink to={marketPath('/markets', isolatedCategory)}>
            Markets
          </NavLink>
        </nav>
        <div className="header-right">
          <button
            className="wallet-button"
            onClick={showWallet}
            disabled={isConnecting || isReconnecting}
          >
            <Wallet size={16} />
            {isConnecting || isReconnecting
              ? "Connecting…"
              : isConnected && address
                ? `${address.slice(0, 6)}…${address.slice(-4)}`
                : "Connect wallet"}
            {isConnected && <span className="connection-dot" />}
          </button>
        </div>
      </header>
      <main>
        <div className={dashboardMatch || marketsMatch || reserveMatch || isolatedMatch ? 'dashboard-route-content' : 'content'}>
          <Routes>
            <Route path="/" element={<Navigate to={marketPath('/dashboard', isolatedCategory)} replace />} />
            <Route
              path="/dashboard"
              element={
                <LendingDashboard key={search} onConnect={showWallet} beforeSubmit={beforeTransaction} onHelp={() => setHelp(true)} />
              }
            />
            <Route
              path="/markets"
              element={<LendingMarkets onHelp={() => setHelp(true)} onConnect={showWallet} beforeSubmit={beforeTransaction} />}
            />
            <Route path="/markets/:symbol" element={<LendingMarkets onHelp={() => setHelp(true)} onConnect={showWallet} beforeSubmit={beforeTransaction} />} />
            <Route path="/markets/isolated/:symbol" element={<LegacyReserve />} />
            <Route path="/dashboard/isolated/:symbol" element={<Navigate to="/dashboard?category=isolated" replace />} />
            <Route
              path="*"
              element={
                <section className="empty not-found">
                  <span className="tag">404</span>
                  <h1>Page not found</h1>
                  <p>This page does not exist or has moved.</p>
                  <Link className="primary" to={marketPath('/dashboard', isolatedCategory)}>
                    Back to dashboard
                  </Link>
                </section>
              }
            />
          </Routes>
          {page && (
            <div className="risk-footer">
              <CircleHelp size={17} />
              <p>
                Understand the risks before borrowing. A health factor below 1
                may trigger liquidation. Tokenized stocks also carry price-gap
                risk during market closures.
              </p>
              <button onClick={() => setHelp(true)}>
                Learn more <ArrowUpRight size={14} />
              </button>
            </div>
          )}
        </div>
      </main>
      <footer>
        <span className="footer-brand">
          <span className="brand-orbit" /> orbit{" "}
          <span>Put your assets to work.</span>
        </span>
        <div>
          <span className="inline">
            <img className="chain-icon footer-chain-icon" src={robinhoodIcon} alt="" width={16} height={16} /> {robinhood.name}
          </span>
          <span>Multi-asset lending</span>
          <button onClick={() => setHelp(true)}>
            Risks & information <ArrowUpRight size={13} />
          </button>
        </div>
      </footer>
      {help && (
        <Modal
          title="About this lending market"
          description="Supply assets, borrow liquidity and manage your positions."
          onClose={() => setHelp(false)}
        >
          <div className="help-copy">
            <Layers3 size={30} />
            <h3>Supply and borrow</h3>
            <p>
              Supply supported assets to earn variable interest. Eligible assets enabled as collateral provide borrowing power within the selected pool. Each pool has its own collateral and debt balances; borrowing power cannot be combined across pools.
            </p>
            <h3>Monitor your health factor</h3>
            <p>
              Health factor = collateral value weighted by liquidation
              thresholds ÷ debt value. Below 1, your position may be liquidated.
              Repaying debt can improve your health factor. Withdrawals are subject to collateral requirements and available liquidity. Review your position before borrowing or withdrawing; estimates may change with prices and accrued interest.
            </p>
            <h3>Rates and risks</h3>
            <p>Supply and borrow rates change with market utilization. Available borrowing depends on your collateral, pool liquidity and applicable limits. Asset prices can fall, and tokenized securities may experience price gaps. Monitor your positions regularly.</p>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
