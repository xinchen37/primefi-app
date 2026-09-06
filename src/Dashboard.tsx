import { ArrowDownLeft, ArrowUpRight, ShieldCheck, Wallet } from "lucide-react";
import { AssetName, Toggle, Health, DetailButton } from "./components";
import {
  assets,
  type Portfolio,
  type Asset,
  type Action,
  totals,
  money,
  number,
  maximum,
} from "./model";
interface Props {
  portfolio: Portfolio;
  connected: boolean;
  onConnect: () => void;
  onAction: (a: Asset, action: Action) => void;
  onCollateral: (a: Asset, v: boolean) => void;
  onDetail: (a: Asset) => void;
}
export default function Dashboard({
  portfolio: p,
  connected,
  onConnect,
  onAction,
  onCollateral,
  onDetail,
}: Props) {
  const t = totals(p);
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Your positions</h2>
          <p>Earn on your assets. Unlock liquidity from your holdings.</p>
        </div>
        <span className="subtle inline">
          <ShieldCheck size={15} /> Your assets, your control
        </span>
      </div>
      <div className="position-grid">
        <section className="panel">
          <div className="panel-title">
            <span className="inline">
              <ArrowDownLeft size={19} />
              <h3>Your supplies</h3>
            </span>
            <span className="tag">Your supplies</span>
          </div>
          <div className="panel-stats">
            <div>
              <small>Supply balance</small>
              <strong>{money(t.supplied)}</strong>
            </div>
            <div>
              <small>Weighted supply APY</small>
              <strong>
                {t.supplied
                  ? (
                      assets.reduce(
                        (s, a) =>
                          s + p[a.symbol].supplied * a.price * a.supplyApy,
                        0,
                      ) / t.supplied
                    ).toFixed(2)
                  : "0.00"}
                <em>%</em>
              </strong>
            </div>
          </div>
          {t.supplied > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Balance / APY</th>
                    <th>Collateral</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {assets
                    .filter((a) => p[a.symbol].supplied > 0)
                    .map((a) => (
                      <tr key={a.symbol}>
                        <td>
                          <AssetName asset={a} />
                        </td>
                        <td>
                          <strong>{number(p[a.symbol].supplied)}</strong>
                          <small>{a.supplyApy.toFixed(2)}%</small>
                        </td>
                        <td>
                          <Toggle
                            checked={p[a.symbol].collateral}
                            onChange={(v) => onCollateral(a, v)}
                            label={`Use ${a.symbol} as collateral`}
                          />
                        </td>
                        <td>
                          <button
                            className="secondary"
                            onClick={() => onAction(a, "withdraw")}
                          >
                            Withdraw
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              connected={connected}
              onConnect={onConnect}
              text="Supply your first asset to start earning."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <span className="inline">
              <ArrowUpRight size={19} />
              <h3>Your borrows</h3>
            </span>
            <span className="tag">Your borrows</span>
          </div>
          <div className="panel-stats">
            <div>
              <small>Borrow balance</small>
              <strong>{money(t.debt)}</strong>
            </div>
            <div>
              <small>
                Health factor{" "}
                <span title="Collateral value weighted by liquidation thresholds / debt value">
                  ⓘ
                </span>
              </small>
              <strong>
                <Health value={t.hf} />
              </strong>
            </div>
          </div>
          {t.debt > 0 ? (
            <>
              <div className="health-strip">
                <div>
                  <span className="healthy">
                    ● {t.hf >= 1.5 ? "Healthy position" : "Position at risk"}
                  </span>
                  <span>Liquidation below 1.00</span>
                </div>
                <div className="health-bar">
                  <i style={{ left: `${Math.min(96, (t.hf / 6) * 100)}%` }} />
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Debt balance</th>
                      <th>Variable APY</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {assets
                      .filter((a) => p[a.symbol].debt > 0)
                      .map((a) => (
                        <tr key={a.symbol}>
                          <td>
                            <AssetName asset={a} />
                          </td>
                          <td>
                            <strong>{number(p[a.symbol].debt)}</strong>
                            <small>{money(p[a.symbol].debt * a.price)}</small>
                          </td>
                          <td>{a.borrowApy.toFixed(2)}%</td>
                          <td>
                            <button
                              className="secondary"
                              onClick={() => onAction(a, "repay")}
                            >
                              Repay
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="panel-bottom">
                <span>Borrow power used</span>
                <strong>
                  {t.limit ? ((t.debt / t.limit) * 100).toFixed(2) : 0}%
                </strong>
                <div className="progress">
                  <i
                    style={{
                      width: `${Math.min(100, t.limit ? (t.debt / t.limit) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <Empty
              connected={connected}
              onConnect={onConnect}
              text="Supply collateral to borrow USDG or ETH."
            />
          )}
        </section>
      </div>
      <div className="position-grid asset-panels">
        <section className="panel">
          <div className="panel-title">
            <h3>Assets to supply</h3>
            <span className="subtle">Demo funds</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Demo balance</th>
                  <th>Supply APY</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assets
                  .filter((a) => !connected || p[a.symbol].wallet > 0)
                  .map((a) => (
                    <tr key={a.symbol}>
                      <td>
                        <AssetName asset={a} />
                      </td>
                      <td>
                        <strong>
                          {connected ? number(p[a.symbol].wallet) : "—"}
                        </strong>
                        <small>
                          {connected
                            ? money(p[a.symbol].wallet * a.price)
                            : "Connect to view"}
                        </small>
                      </td>
                      <td>
                        <span className="apy">
                          {a.supplyApy.toFixed(2)}
                          <small>%</small>
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="primary"
                            onClick={() =>
                              connected ? onAction(a, "supply") : onConnect()
                            }
                          >
                            Supply
                          </button>
                          <DetailButton onClick={() => onDetail(a)} />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            Tokenized stocks can be used as collateral and currently earn no
            interest.
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <h3>Assets to borrow</h3>
            <span className="subtle">Variable rates</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Available</th>
                  <th>Borrow APY</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assets
                  .filter((a) => a.borrowCap > 0)
                  .map((a) => (
                    <tr key={a.symbol}>
                      <td>
                        <AssetName asset={a} />
                      </td>
                      <td>
                        <strong>
                          {number(connected ? maximum("borrow", a, p) : 0)}
                        </strong>
                        <small>
                          {money(
                            connected ? maximum("borrow", a, p) * a.price : 0,
                          )}
                        </small>
                      </td>
                      <td>
                        <span className="apy">
                          {a.borrowApy.toFixed(2)}
                          <small>%</small>
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="secondary"
                            disabled={connected && maximum("borrow", a, p) <= 0}
                            onClick={() =>
                              connected ? onAction(a, "borrow") : onConnect()
                            }
                          >
                            Borrow
                          </button>
                          <DetailButton onClick={() => onDetail(a)} />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            Borrow limits depend on collateral value, reserve caps and available
            liquidity.
          </div>
        </section>
      </div>
    </>
  );
}
function Empty({
  connected,
  onConnect,
  text,
}: {
  connected: boolean;
  onConnect: () => void;
  text: string;
}) {
  return (
    <div className="empty">
      <Wallet size={26} />
      <p>{text}</p>
      {!connected && (
        <button className="secondary" onClick={onConnect}>
          Connect wallet
        </button>
      )}
    </div>
  );
}
