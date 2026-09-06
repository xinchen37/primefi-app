import { useRef, useState } from "react";
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
  beforeSubmit,
}: {
  asset: Asset;
  action: Action;
  portfolio: Portfolio;
  onClose: () => void;
  onComplete: (p: Portfolio, message: string) => void;
  beforeSubmit: () => Promise<void>;
}) {
  const [input, setInput] = useState(""),
    [submitError, setSubmitError] = useState(''),
    [collateral, setCollateral] = useState(portfolio[asset.symbol].collateral),
    [stage, setStage] = useState<"edit" | "pending" | "success">("edit");
  const submitting = useRef(false);
  const amount = Number(input),
    max = maximum(action, asset, portfolio),
    before = totals(portfolio),
    next = preview(portfolio, asset, action, amount || 0, collateral),
    after = totals(next),
    error = validate(portfolio, asset, action, amount, collateral);
  async function submit() {
    if (error || stage !== "edit" || submitting.current) return;
    submitting.current = true;
    setSubmitError('');
    setStage("pending");
    try {
      await beforeSubmit();
      onComplete(
        next,
        `${labels[action]} successful: ${number(amount)} ${asset.symbol}`,
      );
      setStage("success");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to complete the operation. Please try again.');
      setStage('edit');
    } finally { submitting.current = false; }
  }
  return (
    <Modal
      title={`${labels[action]} ${asset.symbol}`}
      description="Review your amount and position changes."
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
          <p>Your position has been updated.</p>
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
                —
              </strong>
            </div>
          </div>
          <Note>
            {action === "repay"
              ? "Repay part or all of your outstanding balance to reduce debt and improve your health factor."
              : asset.symbol === "NVDA"
                ? "Tokenized stocks support supply and collateral only. Price gaps may occur while traditional markets are closed."
                : "A health factor below 1 may trigger liquidation. Interest rates vary with market utilization."}
          </Note>
          {input && error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {submitError && <p role="alert" className="error">{submitError}</p>}
          <button
            className="primary full"
            disabled={!!error || stage === "pending"}
            onClick={submit}
          >
            {stage === "pending" ? (
              <>
                <LoaderCircle className="spin" size={17} /> Processing…
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
