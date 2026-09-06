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
import ReserveOverview from "./ReserveOverview";
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
  const { pathname } = useLocation();
  const dashboardMatch = useMatch("/dashboard");
  const marketsMatch = useMatch("/markets");
  const reserveMatch = useMatch("/markets/:symbol");
  const reserveTitle = assets.find(a => a.symbol.toLowerCase() === reserveMatch?.params.symbol?.toLowerCase())?.name;
  const page = dashboardMatch ? "dashboard" : marketsMatch ? "markets" : null;
  const { address, isConnected, isConnecting, isReconnecting } =
    useAccount();
  const { open } = useAppKit();
  const { switchChainAsync } = useSwitchChain();
  const config = useConfig();
  const collateralPending = useRef(false);
  const [portfolio, setPortfolio] = useState<Portfolio>(load),
    [help, setHelp] = useState(false),
    [detail, setDetail] = useState<Asset | null>(null),
    [transaction, setTransaction] = useState<{
      asset: Asset;
      action: Action;
    } | null>(null),
    [toast, setToast] = useState("");
  useEffect(() => {
    document.title = `${reserveTitle || (page === "dashboard" ? "Dashboard" : page === "markets" ? "Markets" : "Page not found")} · Orbit`;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setDetail(null);
    setTransaction(null);
    setHelp(false);
    setToast("");
  }, [pathname, page, reserveTitle]);
  const connected = isConnected;
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
  const market = assets.reduce(
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
          <NavLink to="/dashboard" end>
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
              <span className="subtle">Lending market</span>
            </div>
            <div className="overview-heading">
              <h1>
                {page === "dashboard"
                  ? "Your assets. More possibilities."
                  : "Multi-asset lending market."}
              </h1>
              <button className="text-button" onClick={() => setHelp(true)}>
                How lending works <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="overview-stats">
              {page === "dashboard" ? (
                <>
                  <div>
                    <span>Net worth</span>
                    <strong>{money(t.supplied - t.debt)}</strong>
                  </div>
                  <div>
                    <span>
                      Net APY{" "}
                      <span title="Estimated annual net interest / net worth">
                        ⓘ
                      </span>
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
                    <span>Total market size</span>
                    <strong>${compact(market.supply)}</strong>
                  </div>
                  <div>
                    <span>Total borrowed</span>
                    <strong>${compact(market.debt)}</strong>
                  </div>
                  <div>
                    <span>Available liquidity</span>
                    <strong>${compact(market.supply - market.debt)}</strong>
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
                <Dashboard
                  portfolio={visible}
                  connected={connected}
                  onConnect={showWallet}
                  onAction={(asset, action) =>
                    setTransaction({ asset, action })
                  }
                  onCollateral={collateral}
                  onDetail={setDetail}
                />
              }
            />
            <Route
              path="/markets"
              element={<Markets portfolio={portfolio} />}
            />
            <Route path="/markets/:symbol" element={<ReserveOverview portfolio={portfolio} connected={connected} onConnect={showWallet} onAction={(asset, action) => setTransaction({ asset, action })} />} />
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
              Supply USDG, ETH or NVDA and enable collateral to borrow USDG or
              ETH. Repay your debt to release collateral.
            </p>
            <h3>Monitor your health factor</h3>
            <p>
              Health factor = collateral value weighted by liquidation
              thresholds ÷ debt value. Below 1, your position may be liquidated.
              Preview the impact before borrowing or withdrawing.
            </p>
            <h3>Asset-specific risk</h3>
            <p>Each asset has its own collateral limits, supply cap and borrow cap. Available liquidity determines how much you can borrow or withdraw.</p>
            <p>Tokenized stocks can be supplied and used as collateral, but cannot be borrowed. Market closures and price gaps may increase liquidation risk.</p>
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
