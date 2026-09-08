# Testnet lending integration

Dashboard has two peer categories, with no sub-level: Core Market maps to the deployed Stable pool (USDG/WETH); Isolated Markets maps to the deployed Stock pool (USDG/NVDA), on chain 46630. `/dashboard` selects Stable and `/dashboard?category=isolated` selects Stock; legacy `?pool=stable` and `?pool=stock` links remain supported. This UI classification does not override contract-enforced risk parameters. It does not read or mutate the earlier local-storage demonstration portfolio. Each pool/account has its own query cache. WETH is always ERC-20 WETH: no gateway or native wrapping/unwrapping is performed. SPY and the PONS/CASHCAT/AI markets are not deployed and cannot transact.

## Local configuration

Edit `local-config.ts` to maintain deployments. No backend configuration endpoint or replaceable remote source is used. `loadLendingConfig(chainId)` validates the bundled configuration; its Promise signature is retained for existing callers. Configuration works offline and is cached without automatic stale refetches; balances still require RPC.

- Define tokens once per chain with `symbol`, `address`, `decimals`, `name`, `iconSymbol` and optional `previewPath`. Shared USDG references use the same definition in both pools. Unknown icons display token initials rather than the USDG icon.
- Each market supplies `id`, `name`, `pool`, `oracle` and its token list. Keep `stable` and `stock` IDs for the existing two dashboard tabs. `previewPath` must point to an existing local market preview route; omit it for tokens without a preview page.
- Add a separate chain entry for a future deployment; never reuse testnet addresses on mainnet. Unsupported networks fail closed. Network/RPC settings remain in `src/network.ts` and its existing environment configuration.
- Validation rejects zero/invalid addresses, duplicate pools, duplicate market IDs, duplicate assets/symbols within a pool, inconsistent shared token decimals/symbols, invalid decimals and external preview URLs.
- Rebuild/redeploy the frontend after editing production configuration. Store public addresses only, never private keys or signing secrets.
- APYs, balances, collateral flags and caps remain on-chain data, not local overrides. Changing a label does not activate Isolation Mode or repair the current Stock risk configuration.

## Operations

`supply(io, request)`, `repay(io, request)`, `borrow(io, request)` and `withdraw(io, request)` in `service.ts` accept the chain ID, captured account, market, asset and **decimal string** amount, with an optional progress callback. They return a confirmed transaction hash or throw. `createLendingIO(wagmiConfig)` supplies read/simulate/write/receipt/session operations using the connected wallet. It never owns a private key.

- Strict bigint conversion; excess decimal places are rejected, never rounded.
- Supply/repay approve only the entered amount to the selected Pool, with a zero reset if needed. Approval receipts and resulting allowance are verified.
- Borrow/repay use variable interest mode `2`; beneficiary/recipient is the reviewed connected account. There is no delegation.
- Every write is simulated before wallet signing; chain/account/connector are checked between asynchronous steps. No automatic write retries.
- A successful receipt is required before success UI and query invalidation. Replacements that cancel/change the operation are not reported as success. A confirmation timeout shows the submitted hash and blocks further submission in that modal; inspect the explorer before reopening it.
- MAX uses the current exact on-chain balance/indicative borrow power. It is not an unlimited allowance or uint256 sentinel. Repay may leave accrued interest dust; refresh and repay the remainder. Withdraw maximum is a balance/liquidity ceiling; simulation additionally enforces collateral safety.
- Read errors are shown explicitly, with retry; no mock fallback. Tables refresh every 20 seconds and after a confirmed transaction. Existing Markets pages remain presentation previews, not authoritative deployed pool data; writes there are redirected by a notice to Dashboard.

## Verification

Transaction review rows show current reserve APY, current/estimated health factor, estimated total pool debt and an RPC gas estimate in ETH. Estimates use current prices; accrued interest, price changes and protocol rounding can change the outcome. Collateral-changing projections are withheld for unknown automatic activation or non-default eMode. Supply collateral status is informational, not a new collateral-toggle transaction. Gas estimates exclude approvals and additional L1 fees; estimation failures are displayed, never replaced with mock fees. Wallet confirmation remains authoritative.

`pnpm test` runs deterministic operation/configuration tests without a wallet.

`LENDING_RPC_CHECK=1 pnpm exec vitest run src/lending/rpc.test.ts` runs opt-in read-only testnet integration checks (RPC access required).

`pnpm build:dev` and `pnpm build:prod` both build to `dist`. Production disables these testnet contracts.

Manual wallet acceptance: obtain test ETH for gas and the deployed test tokens; connect, select a pool, supply, borrow, repay and withdraw, confirming each wallet request. Check separate USDG positions in both pools, rejected requests, account/network switching and receipt links. Automated tests do **not** send live transactions. Do not use production funds.
