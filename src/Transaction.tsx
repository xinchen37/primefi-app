import { useState } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Modal, Token, Toggle, Health, Note } from "./components";
import {
  type Asset,
  type Action,
  type Portfolio,
  maximum,
  money,
  number,
  totals,
  preview,
  validate,
} from "./model";
export const labels: Record<Action, string> = {
  supply: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
};
export default function Transaction({
  asset,
  action,
  portfolio,
  onClose,
  onComplete,
}: {
  asset: Asset;
  action: Action;
  portfolio: Portfolio;
  onClose: () => void;
  onComplete: (p: Portfolio, message: string) => void;
}) {
  const [input, setInput] = useState(""),
    [collateral, setCollateral] = useState(portfolio[asset.symbol].collateral),
    [stage, setStage] = useState<"edit" | "pending" | "success">("edit");
  const amount = Number(input),
    max = maximum(action, asset, portfolio),
    before = totals(portfolio),
    next = preview(portfolio, asset, action, amount || 0, collateral),
    after = totals(next),
    error = validate(portfolio, asset, action, amount, collateral);
  function submit() {
    if (error || stage !== "edit") return;
    setStage("pending");
    setTimeout(() => {
      onComplete(
        next,
        `${labels[action]} successful: ${number(amount)} ${asset.symbol}`,
      );
      setStage("success");
    }, 750);
  }
  return (
    <Modal
      title={`${labels[action]} ${asset.symbol}`}
      description="Simulated transaction · No signature or real asset transfer"
      onClose={() => stage !== "pending" && onClose()}
    >
      {stage === "success" ? (
        <div className="success">
          <span>
            <Check size={32} />
          </span>
          <h2>{labels[action]} successful</h2>
          <p>
            {number(amount)} {asset.symbol}
          </p>
          <p>Your demo position has been updated.</p>
          <button className="primary full" onClick={onClose}>
            Back to dashboard
          </button>
        </div>
      ) : (
        <>
          <div className="amount-heading">
            <span>Amount</span>
            <span>
              Available: {number(max)} {asset.symbol}
            </span>
          </div>
          <div className="amount-box">
            <input
              aria-label="Transaction amount"
              inputMode="decimal"
              placeholder="0.00"
              value={input}
              disabled={stage === "pending"}
              onChange={(e) => setInput(e.target.value)}
            />
            <Token symbol={asset.symbol} small />
            <strong>{asset.symbol}</strong>
            <button
              disabled={stage === "pending"}
              onClick={() => setInput(String(Math.floor(max * 1e6) / 1e6))}
            >
              MAX
            </button>
            <small>
              ≈ {money(Number.isFinite(amount) ? amount * asset.price : 0)}
            </small>
          </div>
          {action === "supply" && (
            <div className="detail-row">
              <span>Use as collateral</span>
              <Toggle
                checked={collateral}
                onChange={setCollateral}
                disabled={stage === "pending"}
                label="Use supplied asset as collateral"
              />
            </div>
          )}
          <div className="transaction-details">
            <div className="detail-row">
              <span>
                {action === "supply" || action === "withdraw"
                  ? "Supply"
                  : "Variable borrow"}{" "}
                APY
              </span>
              <strong>
                {action === "supply" || action === "withdraw"
                  ? asset.supplyApy
                  : asset.borrowApy}
                %
              </strong>
            </div>
            <div className="detail-row">
              <span>Health factor</span>
              <strong className="inline">
                <Health value={before.hf} />
                <ArrowRight size={14} />
                <Health value={after.hf} />
              </strong>
            </div>
            <div className="detail-row">
              <span>Total debt after transaction</span>
              <strong>{money(after.debt)}</strong>
            </div>
            <div className="detail-row">
              <span>Network fee</span>
              <strong>
                $0.00 <small>Demo</small>
              </strong>
            </div>
          </div>
          <Note>
            {action === "repay"
              ? "Demo debt includes interest as of the snapshot. Live repayment amounts will be fetched after contract integration."
              : asset.symbol === "NVDA"
                ? "Tokenized stocks support supply and collateral only. Price gaps may occur while traditional markets are closed."
                : "A health factor below 1 may trigger liquidation. Interest rates vary with market utilization."}
          </Note>
          {input && error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="primary full"
            disabled={!!error || stage === "pending"}
            onClick={submit}
          >
            {stage === "pending" ? (
              <>
                <LoaderCircle className="spin" size={17} /> Simulating transaction…
              </>
            ) : (
              `Confirm ${labels[action].toLowerCase()}`
            )}
          </button>
        </>
      )}
    </Modal>
  );
}
