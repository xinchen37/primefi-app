import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MarketCategoryTabs } from './MarketNavigation';
import IsolatedMarkets from './IsolatedMarkets';
import type { IsolatedPortfolio } from './isolated';
import { Search, ArrowUpRight } from "lucide-react";
import {
  assets,
  type Portfolio,
  compact,
  money,
  reserve,
} from "./model";
import { AssetName } from "./components";
export default function Markets({
  portfolio,
  isolatedPortfolio,
}: {
  portfolio: Portfolio;
  isolatedPortfolio: IsolatedPortfolio;
}) {
  const [search, setSearch] = useState("");
  const [params] = useSearchParams();
  const isolated = params.get('category') === 'isolated';
  if (isolated) return <><MarketCategoryTabs isolated /><IsolatedMarkets portfolio={isolatedPortfolio} /></>;
  return (
    <>
      <MarketCategoryTabs isolated={false} />
      <div className="section-heading">
        <div>
          <h2>Core market</h2>
          <p>Combine eligible USDG, ETH, NVDA and SPY collateral within the core market.</p>
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
              <th>Borrow cap</th>
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
                      <Link to={`/markets/${a.symbol.toLowerCase()}`}><AssetName asset={a} /></Link>
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
                      {Number.isFinite(a.borrowCap) ? money(a.borrowCap * a.price) : 'No limit'}
                      {Number.isFinite(a.borrowCap) && <small>{compact(a.borrowCap)} {a.symbol}</small>}
                    </td>
                    <td>
                      <Link
                        className="icon-button"
                        aria-label={`View ${a.symbol} details`}
                        to={`/markets/${a.symbol.toLowerCase()}`}
                      >
                        <ArrowUpRight size={18} />
                      </Link>
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
            Maximum LTV is 75% for USDG, 73% for ETH, 65% for SPY and 58% for NVDA. No supply caps apply.
          </p>
        </div>
        <div>
          <span>02 / TOKENIZED STOCKS</span>
          <h3>More possibilities for your holdings.</h3>
          <p>
            Supply or borrow NVDA and SPY. Borrow caps are $250K for NVDA and $300K for SPY. Tokenized securities track underlying prices and carry issuer and price-gap risks.
          </p>
        </div>
      </div>
    </>
  );
}
