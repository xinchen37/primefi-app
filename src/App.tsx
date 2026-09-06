import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { robinhood } from "./wallet";
import {
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  FlaskConical,
  Globe2,
  Layers3,
  RotateCcw,
  Wallet,
  X,
  CheckCircle2,
} from "lucide-react";
import Dashboard from "./Dashboard";
import Markets from "./Markets";
import AssetDetail from "./AssetDetail";
import Transaction from "./Transaction";
import { Modal } from "./components";
import {
  assets,
  initial,
  empty,
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
  const { address, isConnected, isConnecting, isReconnecting, chainId } =
    useAccount();
  const { open } = useAppKit();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const [portfolio, setPortfolio] = useState<Portfolio>(load),
    [demoEnabled, setDemoEnabled] = useState(false),
    [page, setPage] = useState<"dashboard" | "markets">("dashboard"),
    [help, setHelp] = useState(false),
    [detail, setDetail] = useState<Asset | null>(null),
    [transaction, setTransaction] = useState<{
      asset: Asset;
      action: Action;
    } | null>(null),
    [toast, setToast] = useState(""),
    [reset, setReset] = useState(false);
  const connected = isConnected || demoEnabled;
  async function showWallet() {
    try {
      await open({ view: isConnected ? "Account" : "Connect" });
    } catch {
      setToast(
        "Unable to open wallet connection. Check your connection and try again.",
      );
    }
  }
  async function switchNetwork() {
    if (!isConnected) {
      await showWallet();
      return;
    }
    try {
      await switchChainAsync({ chainId: robinhood.id });
    } catch {
      setToast(
        "Network switch was declined or failed. Please try again in your wallet.",
      );
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
  function collateral(a: Asset, value: boolean) {
    const next = structuredClone(portfolio);
    next[a.symbol].collateral = value;
    if (totals(next).hf < 1.01) {
      setToast(
        "Cannot disable collateral: health factor would be too low. Repay debt first.",
      );
      return;
    }
    save(next, `${a.symbol} collateral ${value ? "enabled" : "disabled"}`);
  }
  return (
    <div className="app-shell">
      <header className="header">
        <a
          className="brand"
          href="#"
          onClick={() => setPage("dashboard")}
          aria-label="Orbit home"
        >
          <span className="brand-orbit" />
          orbit<span className="brand-beta">BETA</span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={page === "markets" ? "active" : ""}
            onClick={() => setPage("markets")}
          >
            Markets
          </button>
        </nav>
        <div className="header-right">
          <button
            className="network"
            aria-label="Switch to Robinhood Chain"
            disabled={isSwitching}
            onClick={switchNetwork}
          >
            <span className="chain-icon">↗</span>
            <span>{isSwitching ? "Switching…" : "Robinhood"}</span>
            <ChevronDown size={14} />
          </button>
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
      <div className="demo-banner">
        <FlaskConical size={14} />
        <span>
          Lending demo · All positions and balances below are simulated,
          including after connecting a real wallet. No onchain transactions.
        </span>
        <button aria-label="Reset demo" onClick={() => setReset(true)}>
          <RotateCcw size={13} />
          <span>Reset demo</span>
        </button>
      </div>
      {isConnected && chainId !== robinhood.id && (
        <div className="network-warning" role="status">
          <span>Your wallet is on another network.</span>
          <button
            className="secondary"
            disabled={isSwitching}
            onClick={switchNetwork}
          >
            {isSwitching ? "Switching…" : "Switch to Robinhood"}
          </button>
        </div>
      )}
      <main>
        <section className="overview">
          <div className="market-eyebrow">
            <span className="chain-icon large">↗</span>
            <span>
              ROBINHOOD CHAIN <span className="version">V3</span>
            </span>
            <span className="live-dot" />{" "}
            <span className="subtle">Demo market</span>
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
        <div className="content">
          {page === "dashboard" ? (
            <Dashboard
              portfolio={visible}
              connected={connected}
              onConnect={showWallet}
              onAction={(asset, action) => setTransaction({ asset, action })}
              onCollateral={collateral}
              onDetail={setDetail}
            />
          ) : (
            <Markets portfolio={portfolio} onDetail={setDetail} />
          )}
          <div className="risk-footer">
            <CircleHelp size={17} />
            <p>
              Understand the risks before borrowing. A health factor below 1 may
              trigger liquidation. Tokenized stocks also carry price-gap risk
              during market closures.
            </p>
            <button onClick={() => setHelp(true)}>
              Learn more <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </main>
      <footer>
        <span className="footer-brand">
          <span className="brand-orbit" /> orbit{" "}
          <span>Put your assets to work.</span>
        </span>
        <div>
          <span className="inline">
            <Globe2 size={13} /> Robinhood Chain
          </span>
          <span>Phase 1 · Multi-asset lending</span>
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
          description="Phase 1 preview · Orbit is a provisional brand name"
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
            <h3>This is a demo environment</h3>
            <p>
              Wallet connections use Reown AppKit and the official Robinhood
              Chain network (4663). Lending positions, balances, rates and caps
              remain local demo data, separate from the connected wallet. There
              is no live interest accrual, oracle, keeper or actual liquidation.
            </p>
            <p>
              Stocks can be supplied but not borrowed. Phase 1 excludes E-Mode
              and leveraged LP positions. Emergency pause states and onchain
              risk controls will be integrated later.
            </p>
          </div>
        </Modal>
      )}
      {reset && (
        <Modal
          title="Reset demo positions"
          description="Only affects demo data saved in this browser"
          onClose={() => setReset(false)}
        >
          <button
            className="primary full"
            onClick={() => {
              save(structuredClone(initial), "Sample positions restored");
              setDemoEnabled(true);
              setReset(false);
            }}
          >
            Restore sample positions
          </button>
          <button
            className="secondary full"
            onClick={() => {
              save(
                structuredClone(empty),
                "Positions cleared. Supply an asset to get started.",
              );
              setDemoEnabled(true);
              setReset(false);
            }}
          >
            Start fresh with demo wallet funds
          </button>
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
