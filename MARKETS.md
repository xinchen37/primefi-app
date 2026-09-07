# Market categories

Frontend implementation based on the September 6, 2026 phase-one parameter specification.

## Routes

- `/markets`: core market, USDG / ETH / NVDA / SPY.
- `/markets?category=isolated`: PONS / CASHCAT / AI collateral-to-USDG markets.
- `/markets/:symbol`: core reserve details.
- `/markets/isolated/:symbol`: isolated market details.
- `/dashboard`: core positions only; the displayed net worth is explicitly core-market scoped.
- `/dashboard?category=isolated`: four-panel isolated dashboard showing supplies, borrows, assets to supply and assets to borrow. USDG debt rows are separated by collateral source, with per-position health factors.
- `/dashboard/isolated/:symbol`: legacy links redirect to the isolated dashboard category.

All route selections support direct navigation and refresh. Existing SPA hosting rewrites apply.

## Risk model

- Core collateral combines only the four core assets. LTV / threshold / penalty / reserve factor follow the supplied specification.
- All supply caps are unbounded. USDG and ETH borrow caps are unbounded. NVDA and SPY borrow caps are $250K and $300K, converted to token quantities using the fixture price.
- Each isolated position has exactly one collateral asset and USDG debt. Core collateral and other isolated positions cannot increase its borrowing power.
- Borrowing checks the position's LTV, remaining market debt ceiling and available market liquidity. Withdrawals preserve a health factor of at least 1.01. Deposits and repayments remain available when a position is unhealthy.
- Isolated debt ceilings: PONS $150K, CASHCAT $150K, AI $100K. Asset-specific parameters live in `src/isolated.ts`.
- The USDG wallet balance is shared across core and isolated actions, while supplied balances and debts are not. A market selection never initiates a network switch. Confirmation uses the existing network guard.

## Integration boundaries

Lending execution, positions, prices, APY history, liquidity and usage remain frontend fixtures. Only wallet connection/network selection uses the wallet integration. No protocol transaction is sent.

The specification's independent markets versus a shared deployment's isolation mode requires contract-team confirmation. The current model intentionally scopes isolated risk independently; fixture liquidity is not an assertion that separate USDG pools have been deployed. Replace this data adapter with the final market IDs and liquidity sources before production.

Core position storage retains `orbit-demo-v1` and migrates missing SPY positions without clearing existing balances. Isolated positions use `orbit-isolated-v2`, with three funded sample positions for new users and untouched legacy empty snapshots. Edited v1 positions are preserved; v2 positions are never reseeded on refresh, including after repayment and withdrawal. These development snapshots are not wallet-indexed backend balances and must be replaced by account/chain/market-keyed queries at integration time.

Core and isolated USDG wallet changes are held in the app owner. Contract addresses are not fabricated; unavailable collector links remain disabled. SPY and the isolated assets use text fallback icons until official assets are provided.

## Local verification

`pnpm test` checks caps, isolation, solvency boundaries and route rendering.
`pnpm build:dev` builds the testnet configuration into `dist`; `pnpm build:prod` uses the production configuration.
`pnpm preview:dev` serves the latest `dist` (it does not rebuild it). Use `pnpm dev` for source hot reload.
