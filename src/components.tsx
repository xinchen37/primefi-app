import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import { X, ArrowUpRight, Info } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from 'react-router-dom';
import { type Asset, type Symbol } from "./model";
import usdgIcon from './images/icon/usdg.svg';
import ethIcon from './images/icon/eth.svg';
import nvdaIcon from './images/icon/nvda.png';
import ponsIcon from './images/icon/pons.jpeg';
import cashcatIcon from './images/icon/cashcat.png';
import aiIcon from './images/icon/ai.png';
const tokenIcons: Partial<Record<string, string>> = {
  USDG: usdgIcon, ETH: ethIcon, NVDA: nvdaIcon,
  PONS: ponsIcon, CASHCAT: cashcatIcon, AI: aiIcon,
};
export function Token({
  symbol,
  small = false,
}: {
  symbol: string;
  small?: boolean;
}) {
  const framed = symbol === 'PONS' || symbol === 'CASHCAT' || symbol === 'AI';
  if (!tokenIcons[symbol]) return <span className={`token token-letter ${small ? 'small' : ''}`} aria-hidden="true">{symbol === 'CASHCAT' ? 'C' : symbol.slice(0, 2)}</span>;
  return (
    <img className={`token ${framed ? 'token-framed' : ''} ${small ? "small" : ""}`} src={tokenIcons[symbol]} alt="" width={33} height={33} />
  );
}
export function TokenPair({ primary, secondary }: {
  primary: Symbol | 'PONS' | 'CASHCAT' | 'AI';
  secondary: Symbol | 'PONS' | 'CASHCAT' | 'AI';
}) {
  return <span className="token token-pair" aria-hidden="true">
    <Token symbol={primary} />
    <span className="token-pair-badge"><Token symbol={secondary} small /></span>
  </span>;
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
export function DetailLink({ to, label }: { to: string; label: string }) {
  return (
    <Link className="icon-button" aria-label={label} to={to}>
      <ArrowUpRight size={17} />
    </Link>
  );
}
