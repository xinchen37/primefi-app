import { Modal, AssetName, Note } from "./components";
import { robinhood } from './network';
import {
  type Asset,
  type Portfolio,
  reserve,
  money,
  number,
  liquidationPrice,
} from "./model";
export default function AssetDetail({
  asset: a,
  portfolio: p,
  onClose,
}: {
  asset: Asset;
  portfolio: Portfolio;
  onClose: () => void;
}) {
  const r = reserve(a, p),
    price = liquidationPrice(a, p);
  return (
    <Modal
      title={`${a.symbol} reserve details`}
      description={`${robinhood.name} · Reserve parameters`}
      onClose={onClose}
    >
      <div className="detail-asset">
        <AssetName asset={a} />
        <strong>{money(a.price)}</strong>
      </div>
      {[
        ["Max LTV", `${a.ltv * 100}%`],
        ["Liquidation threshold", `${a.threshold * 100}%`],
        ["Liquidation penalty", `${a.penalty}%`],
        ["Available liquidity", `${number(r.total - r.borrowed)} ${a.symbol}`],
        ["Supply cap", `${number(a.supplyCap)} ${a.symbol}`],
        [
          "Borrow cap",
          a.borrowCap ? `${number(a.borrowCap)} ${a.symbol}` : "0 · Borrowing disabled",
        ],
        [
          "Est. liquidation price",
          price === null
            ? "No debt or not collateral"
            : price === 0
              ? "Not triggered at $0"
              : money(price),
        ],
      ].map(([label, value]) => (
        <div className="detail-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <Note>
        This estimate assumes all other asset prices and debts remain unchanged. Actual liquidation depends on your account's overall health factor.
      </Note>
      {a.symbol === "NVDA" && (
        <div className="warning">
          Market closures, issuer freezes and price depegs may affect collateral safety.
        </div>
      )}
    </Modal>
  );
}
