import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import { X, ArrowUpRight, Info } from "lucide-react";
import type { ReactNode } from "react";
import { type Asset, type Symbol } from "./model";
export function Token({
  symbol,
  small = false,
}: {
  symbol: Symbol;
  small?: boolean;
}) {
  return (
    <span className={`token token-${symbol} ${small ? "small" : ""}`}>
      {symbol === "ETH" ? "♦" : symbol === "NVDA" ? "◉" : "$"}
    </span>
  );
}
export function AssetName({ asset }: { asset: Asset }) {
  return (
    <div className="asset-name">
      <Token symbol={asset.symbol} />
      <span>
        <strong>{asset.symbol}</strong>
        <small>{asset.name}</small>
      </span>
    </div>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Switch.Root
      className="toggle"
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      disabled={disabled}
    >
      <Switch.Thumb className="thumb" />
    </Switch.Root>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close className="close" aria-label="Close">
            <X size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Health({ value }: { value: number }) {
  return (
    <span className={value < 1.5 ? "danger" : "healthy"}>
      {Number.isFinite(value) ? value.toFixed(2) : "∞"}
    </span>
  );
}
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <Info size={16} />
      <span>{children}</span>
    </div>
  );
}
export function DetailButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="icon-button" aria-label="View asset details" onClick={onClick}>
      <ArrowUpRight size={17} />
    </button>
  );
}
