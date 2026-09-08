# 资产详情页数据对接清单

## 已实现：本地配置 + 链上读取

本地配置只保存 chainId、RPC、pool、oracle、资产地址/名称/图标/精度。所有查询必须以 chainId + pool + asset 为键，USDG 在两个池子中不得合并。

| 页面字段 | 当前来源 |
| --- | --- |
| Reserve size / Total supplied | aToken.totalSupply × oracle.getAssetPrice |
| Total borrowed | variableDebtToken.totalSupply |
| Available liquidity | underlying.balanceOf(aToken)，不是简单地用供应减债务 |
| Utilization rate | variable debt / (variable debt + available liquidity)，展示向下截取 |
| Oracle price | oracle.getAssetPrice / BASE_CURRENCY_UNIT，目前要求美元基准 |
| 当前 Supply / Borrow APY | Pool.getReserveData 中的年化 rate（ray），expm1(rate / 1e27) 转 APY |
| Supply / Borrow cap、LTV、清算阈值/罚金、Reserve factor、暂停/冻结/借款开关 | Pool.getReserveData.configuration 位图；cap 为 0 表示无限额 |
| Collector Contract | aToken.RESERVE_TREASURY_ADDRESS()，独立请求，失败可重试，不伪造地址 |
| Wallet / Supplied / Borrowed | underlying / aToken / variableDebtToken 的 balanceOf |
| 用户抵押开关 | Pool.getUserConfiguration 位图 |
| Health factor / 借款能力 | Pool.getUserAccountData；无债务显示 ∞ |
| Available to supply / borrow | 钱包余额/借款能力/流动性，再结合剩余 supply / borrow cap、暂停/冻结/借款开关 |

可操作额度是快照估算，签名前仍由现有交易模拟校验。供应上限的 accrued-to-treasury、隔离/eMode 等特殊约束仍可能导致模拟收紧额度，不能把展示值作为保证。不增加 native ETH 操作：当前 WETH 是 ERC-20。

## 后端待实现（当前 mock）

只有 **Supply APY 历史点、Borrow APY 历史点及图表平均值** 使用 mock。

- 代码：src/lending/reserveHistory.ts；图表：src/RateChart.tsx。
- 范围：1w / 1m / 6m / 1y；每组 48 个模拟点，按资产/池子区分。
- 图上标明 Mock history，平均值来自模拟点，不是真实收益表现。
- 最新链上 APY 仅用作模拟曲线基线，不能因此视为真实历史。
- Mock 不进入钱包余额、健康度、可操作额度或交易金额。

### 建议接口（待后端实现，前端当前未调用）

GET /api/reserves/history?chainId=46630&pool=0x...&asset=0x...&kind=supply&period=1m

kind: supply | borrow；period: 1w | 1m | 6m | 1y。

响应示例（字段约定，不是真实数据）：

```json
{
  "chainId": 46630,
  "pool": "0x...",
  "asset": "0x...",
  "kind": "supply",
  "period": "1m",
  "rateType": "APY_PERCENT",
  "source": "indexed",
  "points": [
    { "timestamp": 1788825600000, "value": "0.21" }
  ]
}
```

- timestamp 为 UTC 毫秒，升序、去重，value 为百分比十进制字符串（0.21 表示 0.21%，不是 21%）。
- 通过历史区块/ReserveDataUpdated 事件建立持久化索引。当前状态 RPC 不能直接返回整段历史；archive RPC 重建也应在后端完成。
- 后端应明确桶粒度和平均方式，建议等间隔桶；图表平均值目前是点的算术平均，接入后须与桶规则统一。
- APR/ray 不得当作 APY 直接展示；后端若返回 APR，须明确 rateType 并统一转换后再展示。
- 无历史返回空 points；失败展示错误/重试，接入真实接口后禁止静默降级为 mock。
- 查询键至少包含 chainId、pool、asset、kind、period；校验返回键，避免串池。
- 替换位置：将 RateChart 对 mockReserveHistory 的调用换成历史查询适配器，保留原图表的范围切换、日期轴、Tooltip、平均线。

## Aave 参考范围

参考本地 aave-v3-interface/src/modules/reserve-overview：

- ReserveTopDetails / SupplyInfo / BorrowInfo：概览、分块统计、限额占用及抵押参数。
- ReserveActions：钱包态、真实抵押开关、限额以及暂停/冻结操作限制。
- graphs/ApyGraphContainer：历史接口按链/资产/市场/时间范围请求，和当前链上 APY 分开。
- ReserveFactorOverview：Reserve factor 与 Collector 链接。

当前未移植 Aave 专属的 GHO、Merit 奖励、native gateway 和完整 eMode 管理，这些不在当前配置及截图范围。不能通过 Stock 分类名称推断合约已启用 Aave Isolation Mode。
