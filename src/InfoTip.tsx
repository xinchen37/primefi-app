import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { useRef, useState } from 'react';
import { Info } from 'lucide-react';

export const explanations = {
  'Net APY': 'Net APY combines the estimated annual interest earned on supplied assets and paid on borrowed assets, relative to your net worth. It can be negative when borrowing costs exceed supply earnings.',
  'Max LTV': 'Maximum loan-to-value (LTV) determines how much you can borrow against an asset. For example, a 75% LTV allows up to $75 of borrowing for every $100 of eligible collateral. Your total borrowing power depends on all enabled collateral.',
  'Liquidation threshold': 'This percentage determines how much an asset contributes to the collateral value used in your health factor. If your total debt exceeds your collateral value weighted by liquidation thresholds, your health factor falls below 1 and your position may be liquidated.',
  'Liquidation penalty': 'When a position is liquidated, a liquidator repays debt in exchange for collateral. The liquidation penalty is the additional collateral value awarded to the liquidator, increasing the collateral you lose.',
  'APY, variable': 'The annual percentage yield on borrowing changes with market conditions and reserve utilization. Your borrowing cost may increase or decrease over time.',
  'Total supplied': 'The amount currently supplied to this reserve, compared with its supply cap. The cap limits exposure to the asset and helps manage risk. New supplies are restricted when the cap is reached.',
  'Total borrowed': 'The amount currently borrowed from this reserve, compared with its borrow cap. New borrowing is also limited by available liquidity and your collateral-backed borrowing power.',
  'Reserve factor': 'The percentage of borrowing interest allocated to the protocol reserve through the collector contract. The remaining interest contributes to supplier earnings.',
} as const;

export default function InfoTip({ label }: { label: keyof typeof explanations }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <TooltipProvider><Tooltip open={open}>
    <TooltipTrigger asChild><button ref={triggerRef} type="button" className="info-tip-trigger" aria-label={`About ${label}`} aria-expanded={open} onPointerDown={event => event.preventDefault()} onClick={event => { event.preventDefault(); setOpen(value => !value); }} onBlur={() => setOpen(false)}><Info size={15} aria-hidden="true" /></button></TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} collisionPadding={16} onEscapeKeyDown={() => setOpen(false)} onPointerDownOutside={event => { if (triggerRef.current?.contains(event.target as Node)) event.preventDefault(); else setOpen(false); }}>
        <p>{explanations[label]}</p>
      </TooltipContent>
  </Tooltip></TooltipProvider>;
}
