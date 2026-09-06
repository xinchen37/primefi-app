import { useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import {
  assets,
  type Portfolio,
  type Asset,
  compact,
  money,
  reserve,
} from "./model";
import { AssetName } from "./components";
export default function Markets({
  portfolio,
  onDetail,
}: {
  portfolio: Portfolio;
  onDetail: (a: Asset) => void;
}) {
  const [search, setSearch] = useState("");
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Market overview</h2>
          <p>One shared market. Three assets with independent rates and risk parameters.</p>
        </div>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Search assets"
            placeholder="Search assets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <section className="panel market-table table-wrap">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Total supplied</th>
              <th>Supply APY</th>
              <th>Total borrowed</th>
              <th>Borrow APY</th>
              <th>Utilization</th>
              <th>Supply cap used</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {assets
              .filter((a) =>
                (a.symbol + a.name)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((a) => {
                const r = reserve(a, portfolio);
                return (
                  <tr key={a.symbol}>
                    <td>
                      <AssetName asset={a} />
                    </td>
                    <td>
                      <strong>${compact(r.total * a.price)}</strong>
                      <small>
                        {compact(r.total)} {a.symbol}
                      </small>
                    </td>
                    <td className="apy">{a.supplyApy.toFixed(2)}%</td>
                    <td>
                      <strong>${compact(r.borrowed * a.price)}</strong>
                      <small>
                        {compact(r.borrowed)} {a.symbol}
                      </small>
                    </td>
                    <td>
                      {a.borrowCap ? (
                        `${a.borrowApy.toFixed(2)}%`
                      ) : (
                        <span className="tag">Not borrowable</span>
                      )}
                    </td>
                    <td>{((r.borrowed / r.total) * 100).toFixed(1)}%</td>
                    <td>
                      {((r.total / a.supplyCap) * 100).toFixed(1)}%
                      <div className="progress">
                        <i
                          style={{ width: `${(r.total / a.supplyCap) * 100}%` }}
                        />
                      </div>
                      <small>{money(a.supplyCap * a.price)}</small>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`View ${a.symbol} details`}
                        onClick={() => onDetail(a)}
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!assets.some((a) =>
          (a.symbol + a.name).toLowerCase().includes(search.toLowerCase()),
        ) && <div className="empty">No matching assets</div>}
      </section>
      <div className="market-notes">
        <div>
          <span>01 / ASSET-SPECIFIC RISK</span>
          <h3>Different assets. Different limits.</h3>
          <p>
            Maximum LTV is 85% for USDG, 70% for ETH and 60% for tokenized stocks. Each asset has independent supply and borrow caps.
          </p>
        </div>
        <div>
          <span>02 / TOKENIZED STOCKS</span>
          <h3>More possibilities for your holdings.</h3>
          <p>
            NVDA
            is the provisional demo stock, available for supply and collateral. Be mindful of market closures and oracle price gaps.
          </p>
        </div>
      </div>
    </>
  );
}
