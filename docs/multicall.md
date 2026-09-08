# 批量读取与缓存

- 网络：dev/prod 选择 viem 内置 Robinhood Testnet/Mainnet；不接受旧通用 RPC 环境变量。
- 快照：每次公共市场刷新先验证 chainId、获取 blockNumber，并检查 Multicall3 代码；所有合约读取固定在该区块。
- 公共市场两轮：第一轮 oracle 基准/getReserveData/decimals；第二轮 totalSupply/流动性/价格。
- 个人信息：从公共快照复用 reserve、价格、流动性等读取，再批量查询账户配置和个人余额。公共与个人数据保持相同 blockNumber。
- batchRead.ts 对同一快照的相同 calldata 去重，每组最多 32 个调用，viem 另按 4096 字节切块。
- Dashboard、Markets、详情使用同一个 lending-market 查询键，10 秒新鲜期；页面仍按 20 秒刷新，隐藏页面不启用后台轮询。个人缓存包含钱包地址。
- decimals 跨快照缓存 5 分钟；Reserve 数据包含动态利率/配置，不能整体长缓存。aToken 地址随公共快照共享；Collector 已有独立 5 分钟缓存。
- 交易确认先失效公共缓存，再失效个人缓存，避免个人查询复用未失效的旧公共快照。
- Multicall 单项失败保持错误，关键读取失败时整份快照失败，不当作 0。既有旧值可保留展示，交易禁用。
- 只有读取到 Multicall3 无代码才降级为普通调用，降级最多 4 并发。RPC 异常/合约 revert 不触发全量单调用重试；查询保留一次重试。
- 授权、模拟、发送、回执仍为独立交易流程，不进行展示查询聚合或长缓存。

统计口径：Multicall 批次数不含 eth_chainId、eth_blockNumber、eth_getCode、钱包/Reown 请求及低频 Collector 查询，也不等同于传输字节数或服务商计费单位。

验证命令：

```sh
pnpm test
LENDING_RPC_CHECK=1 pnpm exec vitest run src/lending/rpc.test.ts
```

只读集成测试在相同区块对比逐项和批量结果，覆盖两个池子；不执行签名或交易。
