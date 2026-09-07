import { useEffect, useRef, useState } from "react";
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
import Dashboard from "./Dashboard";
import robinhoodIcon from './images/icon/robinhood.png';
import Markets from "./Markets";
import InfoTip from './InfoTip';
import ReserveOverview from "./ReserveOverview";
import IsolatedOverview from './IsolatedOverview';
import IsolatedDashboard from './IsolatedDashboard';
import IsolatedTransaction from './IsolatedTransaction';
import { PositionTabs } from './MarketNavigation';
import { isolatedMarkets, isolatedTotals, loadIsolated, isolatedStorageKey, type IsolatedMarket } from './isolated';
import AssetDetail from "./AssetDetail";
import Transaction from "./Transaction";
import { Modal } from "./components";
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
  const collateralPending = useRef(false);
  const [isolatedPortfolio, setIsolatedPortfolio] = useState(loadIsolated);
  const [isolatedTransaction, setIsolatedTransaction] = useState<{ market: IsolatedMarket; action: Action } | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio>(load),
    [help, setHelp] = useState(false),
    [detail, setDetail] = useState<Asset | null>(null),
    [transaction, setTransaction] = useState<{
      asset: Asset;
      action: Action;
    } | null>(null),
    [toast, setToast] = useState("");
  useEffect(() => {
    document.title = `${isolatedTitle ? `${isolatedTitle} / USDG` : reserveTitle || (page === "dashboard" ? "Dashboard" : page === "markets" ? "Markets" : "Page not found")} · Orbit`;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setDetail(null);
    setTransaction(null);
    setIsolatedTransaction(null);
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
  function save(p: Portfolio, message: string) {
    setPortfolio(p);
    try {
      localStorage.setItem("orbit-demo-v1", JSON.stringify(p));
    } catch {
      /* In-memory demo remains usable. */
    }
    setToast(message);
  }
  function completeIsolated(next: import('./isolated').IsolatedPosition, usdgDelta: number) {
    if (!isolatedTransaction) return;
    const updated = { ...isolatedPortfolio, [isolatedTransaction.market.symbol]: next };
    setIsolatedPortfolio(updated);
    try { localStorage.setItem(isolatedStorageKey, JSON.stringify(updated)); } catch { /* Keep the in-memory position usable. */ }
    save({ ...portfolio, USDG: { ...portfolio.USDG, wallet: portfolio.USDG.wallet + usdgDelta } }, `${isolatedTransaction.market.symbol} / USDG position updated`);
  }
  async function collateral(a: Asset, value: boolean) {
    if (collateralPending.current) return;
    const next = structuredClone(portfolio);
    next[a.symbol].collateral = value;
    if (totals(next).hf < 1.01) {
      setToast(
        "Cannot disable collateral: health factor would be too low. Repay debt first.",
      );
      return;
    }
    collateralPending.current = true;
    try {
      await beforeTransaction();
      save(next, `${a.symbol} collateral ${value ? "enabled" : "disabled"}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to update collateral. Please try again.');
    } finally { collateralPending.current = false; }
  }
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
        {page && (
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
                      {t.netApy.toFixed(2)}
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
        <div className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <><PositionTabs selected={isolatedCategory ? 'isolated' : 'core'} />{isolatedCategory ? <IsolatedDashboard portfolio={isolatedPortfolio} connected={connected} usdgWallet={visible.USDG.wallet} onConnect={showWallet} onAction={(market, action) => setIsolatedTransaction({ market, action })} /> : <Dashboard
                  portfolio={visible}
                  connected={connected}
                  onConnect={showWallet}
                  onAction={(asset, action) =>
                    setTransaction({ asset, action })
                  }
                  onCollateral={collateral}
                />}</>
              }
            />
            <Route
              path="/markets"
              element={<Markets portfolio={portfolio} isolatedPortfolio={isolatedPortfolio} />}
            />
            <Route path="/markets/:symbol" element={<ReserveOverview portfolio={portfolio} connected={connected} onConnect={showWallet} onAction={(asset, action) => setTransaction({ asset, action })} />} />
            <Route path="/markets/isolated/:symbol" element={<IsolatedOverview key={pathname} portfolio={isolatedPortfolio} connected={connected} usdgWallet={visible.USDG.wallet} onConnect={showWallet} onAction={(market, action) => setIsolatedTransaction({ market, action })} />} />
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
      {isolatedTransaction && <IsolatedTransaction market={isolatedTransaction.market} position={isolatedPortfolio[isolatedTransaction.market.symbol]} usdgWallet={visible.USDG.wallet} action={isolatedTransaction.action} beforeSubmit={beforeTransaction} onComplete={completeIsolated} onClose={() => setIsolatedTransaction(null)} />}
      {transaction && (
        <Transaction
          asset={transaction.asset}
          action={transaction.action}
          portfolio={portfolio}
          onClose={() => setTransaction(null)}
          onComplete={save}
          beforeSubmit={beforeTransaction}
        />
      )}
      {detail && (
        <AssetDetail
          asset={detail}
          portfolio={portfolio}
          onClose={() => setDetail(null)}
        />
      )}
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
              In the core market, supply USDG, ETH, NVDA or SPY and combine eligible collateral to borrow. Isolated markets use a single collateral asset to borrow USDG. Repay your debt to release collateral.
            </p>
            <h3>Monitor your health factor</h3>
            <p>
              Health factor = collateral value weighted by liquidation
              thresholds ÷ debt value. Below 1, your position may be liquidated.
              Preview the impact before borrowing or withdrawing.
            </p>
            <h3>Asset-specific risk</h3>
            <p>There are no supply caps. NVDA and SPY have borrow caps; isolated markets have separate USDG debt ceilings. Available liquidity also limits borrowing and withdrawals.</p>
            <p>Tokenized securities can be supplied and borrowed in the core market. PONS, CASHCAT and AI are collateral-only assets in isolated markets. Their collateral and health factors cannot be combined with other positions.</p>
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
