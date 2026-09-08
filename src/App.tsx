import { formatNumber } from './utils/formatNumber';
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useMatch,
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
import Markets from "./Markets";
import InfoTip from './InfoTip';
import ReserveOverview from "./ReserveOverview";
import IsolatedOverview from './IsolatedOverview';
import { isolatedMarkets, isolatedTotals, loadIsolated } from './isolated';
import { Modal, Note } from "./components";
import {
  assets,
  initial,
  totals,
  money,
  compact,
  reserve,
  type Portfolio,
  type Asset,
  type Action,
} from "./model";
function load(): Portfolio {
  try {
    const raw = JSON.parse(localStorage.getItem("orbit-demo-v1") || "null");
    if (raw && typeof raw === 'object' && !raw.SPY) raw.SPY = structuredClone(initial.SPY);
    if (
      raw &&
      assets.every((a) => {
        const x = raw[a.symbol];
        return (
          x &&
          ["wallet", "supplied", "debt"].every(
            (k) =>
              typeof x[k] === "number" && Number.isFinite(x[k]) && x[k] >= 0,
          ) &&
          typeof x.collateral === "boolean"
        );
      })
    )
      return raw;
  } catch {
    /* Start with the demo snapshot if browser storage is unavailable. */
  }
  return structuredClone(initial);
}
export default function App() {
  const { pathname, search } = useLocation();
  const isolatedCategory = new URLSearchParams(search).get('category') === 'isolated';
  const dashboardMatch = useMatch("/dashboard");
  const marketsMatch = useMatch("/markets");
  const reserveMatch = useMatch("/markets/:symbol");
  const isolatedMatch = useMatch('/markets/isolated/:symbol');
  const isolatedDashboardMatch = useMatch('/dashboard/isolated/:symbol');
  const isolatedTitle = isolatedMarkets.find(m => m.symbol.toLowerCase() === (isolatedMatch?.params.symbol || isolatedDashboardMatch?.params.symbol)?.toLowerCase())?.symbol;
  const reserveTitle = assets.find(a => a.symbol.toLowerCase() === reserveMatch?.params.symbol?.toLowerCase())?.name;
  const page = dashboardMatch ? "dashboard" : marketsMatch ? "markets" : null;
  const { address, isConnected, isConnecting, isReconnecting } =
    useAccount();
  const { open } = useAppKit();
  const { switchChainAsync } = useSwitchChain();
  const config = useConfig();
  const [isolatedPortfolio] = useState(loadIsolated);
  const [portfolio] = useState<Portfolio>(load),
    [help, setHelp] = useState(false),
    [toast, setToast] = useState("");
  useEffect(() => {
    document.title = `${isolatedTitle ? `${isolatedTitle} / USDG` : reserveTitle || (page === "dashboard" ? "Dashboard" : page === "markets" ? "Markets" : "Page not found")} · Orbit`;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setHelp(false);
    setToast("");
  }, [pathname, search, page, reserveTitle, isolatedTitle]);
  const connected = isConnected;
  const isolatedSummary = isolatedMarkets.reduce((sum, m) => {
    const p = isolatedPortfolio[m.symbol];
    return { collateral: sum.collateral + (connected ? p.supplied * m.price : 0), debt: sum.debt + (connected ? p.debt : 0) };
  }, { collateral: 0, debt: 0 });
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
  const visible = connected
      ? portfolio
      : (Object.fromEntries(
          assets.map((a) => [
            a.symbol,
            { wallet: 0, supplied: 0, debt: 0, collateral: false },
          ]),
        ) as Portfolio),
    t = totals(visible);
  const market = isolatedCategory ? isolatedMarkets.reduce((sum, m) => { const t = isolatedTotals(m, isolatedPortfolio[m.symbol]); return { supply: sum.supply + t.totalCollateral * m.price, debt: sum.debt + t.totalDebt }; }, { supply: 0, debt: 0 }) : assets.reduce(
    (v, a) => {
      const r = reserve(a, portfolio);
      return {
        supply: v.supply + r.total * a.price,
        debt: v.debt + r.borrowed * a.price,
      };
    },
    { supply: 0, debt: 0 },
  );
  return (
    <div className="app-shell">
      <header className="header">
        <Link className="brand" to="/dashboard" aria-label="Orbit home">
          <span className="brand-orbit" />
          orbit
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/dashboard">
            Dashboard
          </NavLink>
          <NavLink to="/markets">
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
        {page && !dashboardMatch && (
          <section className="overview">
            <div className="market-eyebrow">
              <img className="chain-icon large" src={robinhoodIcon} alt="" width={30} height={30} />
              <span>
                {robinhood.name.toUpperCase()}
              </span>
              <span className="live-dot" />{" "}
              <span className="subtle">{isolatedCategory ? 'Isolated markets' : 'Core market'}</span>
            </div>
            <div className="overview-heading">
              <h1>
                {page === "dashboard"
                  ? "Your assets. More possibilities."
                  : isolatedCategory ? "Isolated lending markets." : "Core lending market."}
              </h1>
              <button className="text-button" onClick={() => setHelp(true)}>
                How lending works <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="overview-stats">
              {page === 'dashboard' && isolatedCategory ? <>
                <div><span>Isolated net worth</span><strong>{money(isolatedSummary.collateral - isolatedSummary.debt)}</strong></div>
                <div><span>Total collateral value</span><strong>{money(isolatedSummary.collateral)}</strong></div>
                <div><span>Total USDG debt</span><strong>{money(isolatedSummary.debt)}</strong></div>
              </> : page === "dashboard" ? (
                <>
                  <div>
                    <span>Core market net worth</span>
                    <strong>{money(t.supplied - t.debt)}</strong>
                  </div>
                  <div>
                    <span>
                      Net APY{" "}
                      <InfoTip label="Net APY" />
                    </span>
                    <strong>
                      {formatNumber(t.netApy, { decimals: 2 })}
                      <em>%</em>
                      <span className="stat-tag">Variable yield</span>
                    </strong>
                  </div>
                  <div>
                    <span>Available borrow power</span>
                    <strong>{money(Math.max(0, t.limit - t.debt))}</strong>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span>{isolatedCategory ? 'Total collateral' : 'Total market size'}</span>
                    <strong>${compact(market.supply)}</strong>
                  </div>
                  <div>
                    <span>Total borrowed</span>
                    <strong>${compact(market.debt)}</strong>
                  </div>
                  <div>
                    <span>{isolatedCategory ? 'Remaining debt capacity' : 'Available liquidity'}</span>
                    <strong>${compact(isolatedCategory ? isolatedMarkets.reduce((sum, m) => { const t = isolatedTotals(m, isolatedPortfolio[m.symbol]); return sum + Math.min(t.remaining, t.liquidity); }, 0) : market.supply - market.debt)}</strong>
                  </div>
                </>
              )}
            </div>
            <div className="orbit-art" aria-hidden="true">
              <div />
              <div />
              <div />
              <span>✦</span>
            </div>
          </section>
        )}
        <div className={dashboardMatch ? 'dashboard-route-content' : 'content'}>
          {(marketsMatch || reserveMatch || isolatedMatch) && <Note>Market preview. <Link to="/dashboard">Open Dashboard</Link> for live pool balances and transactions.</Note>}
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <LendingDashboard key={search} onConnect={showWallet} beforeSubmit={beforeTransaction} onHelp={() => setHelp(true)} />
              }
            />
            <Route
              path="/markets"
              element={<Markets portfolio={portfolio} isolatedPortfolio={isolatedPortfolio} />}
            />
            <Route path="/markets/:symbol" element={<ReserveOverview portfolio={portfolio} connected={connected} onConnect={showWallet} onAction={() => setToast('Open Dashboard to transact in a deployed pool. SPY is not deployed.')} />} />
            <Route path="/markets/isolated/:symbol" element={<IsolatedOverview key={pathname} portfolio={isolatedPortfolio} connected={connected} usdgWallet={visible.USDG.wallet} onConnect={showWallet} onAction={() => setToast('This isolated market is not deployed. Transactions are unavailable.')} />} />
            <Route path="/dashboard/isolated/:symbol" element={<Navigate to="/dashboard?category=isolated" replace />} />
            <Route
              path="*"
              element={
                <section className="empty not-found">
                  <span className="tag">404</span>
                  <h1>Page not found</h1>
                  <p>This page does not exist or has moved.</p>
                  <Link className="primary" to="/dashboard">
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
          description="Supply, borrow and manage your collateral."
          onClose={() => setHelp(false)}
        >
          <div className="help-copy">
            <Layers3 size={30} />
            <h3>Supply → Collateralize → Borrow</h3>
            <p>
              Dashboard connects to two independent deployed pools: Stable (USDG and WETH) and Stock (USDG and NVDA). Supply collateral, borrow within that pool, then repay debt to release collateral. WETH is not native ETH.
            </p>
            <h3>Monitor your health factor</h3>
            <p>
              Health factor = collateral value weighted by liquidation
              thresholds ÷ debt value. Below 1, your position may be liquidated.
              Preview the impact before borrowing or withdrawing.
            </p>
            <h3>Asset-specific risk</h3>
            <p>Caps, liquidity and collateral requirements are enforced by the deployed contracts. A transaction is simulated before signing and only marked successful after confirmation.</p>
            <p>SPY, PONS, CASHCAT and AI are not included in this deployment. Market overview pages remain previews; use Dashboard for live balances and transactions.</p>
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
