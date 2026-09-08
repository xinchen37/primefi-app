# Orbit — 第一期借贷前端

根据 PRD 实现的纯前端交互原型。Orbit 为暂定产品名，NVDA 为暂定股票。采用 React + TypeScript + Vite + pnpm，Tailwind CSS 与 Radix UI。钱包连接已接入真实 Reown AppKit；所有借贷交易仍为本地模拟，不请求交易签名、不发送借贷交易。

## 启动

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

### Build environments

| Command | Network | Output |
| --- | --- | --- |
| `pnpm dev` | Robinhood Chain Testnet (46630) | Local development server |
| `pnpm build:dev` | Robinhood Chain Testnet (46630) | `dist` |
| `pnpm build:prod` | Robinhood Chain (4663) | `dist` |
| `pnpm build` | Alias for `build:prod` | `dist` |
| `pnpm preview:dev` | Serve the latest build | `dist` |
| `pnpm preview:prod` / `pnpm preview` | Serve the latest build | `dist` |

打包命令通过 `--mode dev|prod` 加载对应的 `.env.dev` / `.env.prod`，其中 `VITE_APP_ENV=dev|prod` 是业务代码的统一环境标识：

- `src/environment.ts` 导出 `appEnvironment`，网络和合约配置共同使用。
- `src/network.ts` 选择网络；`VITE_ROBINHOOD_RPC_URL` 配置当前环境 RPC，必须属于相应网络，运行时读链校验仍会检查 chainId。
- `src/lending/local-config.ts` 的 `dev` / `prod` 分别配置对应环境的池子、预言机和币种。当前只有 dev 合约，prod 留空，绝不回退到测试合约；拿到主网部署后再补充 prod。
- 环境标识缺失、非法或与打包 mode 不一致会阻止构建。Vitest 默认使用 dev 配置。
- 不使用 `import.meta.env.PROD` 区分业务环境，因为两种 build 都是优化构建。

可用 `.env.dev.local` / `.env.prod.local` 覆盖同环境配置，修改后重启或重新打包。两种构建均输出 `dist`，后一次会覆盖前一次；preview 仅提供现有产物，不能切换已打包的网络或合约环境。部署需配置 SPA fallback 到 `index.html`。所有 `VITE_*` 变量均为前端公开数据，不得放私钥或服务端密钥。

默认未连接钱包。点击 Connect wallet 连接真实钱包；连接后地址按钮打开 AppKit 账户面板，可复制地址和断开连接。切换账户及重新连接由 Wagmi/AppKit 管理。网络不匹配时显示 Switch to Robinhood，失败或拒绝会提示。无需真实钱包也可通过 Reset demo 恢复示例仓位或从零开始；该操作只启用独立借贷演示，不伪造钱包连接状态。借贷仓位保存在 localStorage，始终是浏览器共享的模拟数据，不代表任何真实地址的持仓。

## 已实现

- URL 路由：`/` 自动跳转 `/dashboard`；`/dashboard` 为仓位控制台；`/markets` 为市场列表；未知地址显示英文 404 页面。支持直接访问、刷新、前进/后退和导航高亮。页面切换保留共享钱包与模拟仓位状态，关闭当前业务弹窗。

### SPA 部署

本地 Vite dev/preview 支持 history fallback。生产静态托管需将非静态文件请求回退到 `index.html`，避免直接访问 `/markets` 时服务器返回 404。例如 Nginx 在站点 `location /` 中使用 `try_files $uri $uri/ /index.html;`。资产详情和交易操作仍为弹窗，不新增独立 URL。

- Dashboard：我的存款、我的借款、可存资产、可借资产。
- Markets：资产搜索、存借规模、APY、利用率、存借硬顶与风险参数详情。
- 存入、提现、借款、部分/全部还款；抵押开关；数量 MAX；交易状态与健康度预览。
- 校验余额、抵押额度、流动性、存借硬顶、危险健康度。NVDA 不可借，存款 APY 为 0。
- 按多抵押品公式计算健康度，并展示其他价格不变前提下的单资产清算价。
- 桌面与移动适配、Radix 弹窗焦点管理、键盘操作与减少动画设置。

## 数据边界与后续对接

`src/model.ts` 集中放置模拟资产、仓位类型、风险计算和交易预览。当前金额使用 JS number，仅适用于演示；接入合约必须改为 viem parseUnits/formatUnits 与 bigint，按合约精度处理舍入。

价格、利率、债务利息均为固定演示快照，操作会更新数量与利用率但不会重新拟合利率或自动计息。硬顶是演示值，不是正式风控配置。前端以健康度 1.01 作为演示操作保护线，协议清算阈值仍为 1。

`src/wallet.ts` 在 React 渲染外初始化 Reown AppKit + WagmiAdapter，根层挂载 WagmiProvider 和 QueryClientProvider。项目 ID 位于 `.env` 的 `VITE_REOWN_PROJECT_ID`，它是公开客户端标识，不是私钥。支持 WalletConnect QR 和浏览器钱包。电子邮箱、社交登录、兑换、入金与分析功能关闭。

网络采用官方配置，集中在 `src/network.ts`：dev 使用测试链 46630、`https://rpc.testnet.chain.robinhood.com` 和 `https://explorer.testnet.chain.robinhood.com`；prod 使用主链 4663、`https://rpc.mainnet.chain.robinhood.com` 和 `https://robinhoodchain.blockscout.com`。公共 RPC 有限流，生产环境可在 `.env.prod.local` 覆盖 `VITE_ROBINHOOD_RPC_URL`。部署前在 Reown Dashboard 配置正式站点 allowed origins。参考 https://docs.robinhood.com/chain/connecting/ 。

`pnpm-workspace.yaml` 将 AppKit 间接依赖的 `@wagmi/core` 和 `@wagmi/connectors` 固定在兼容 Wagmi 2 的版本，避免宽泛 peer 范围自动解析到 Wagmi 3。

下一阶段新增 LendingService 读取储备、余额、债务和账户健康度，并将 `preview`/本地保存替换为合约 simulateContract、writeContract 与交易回执流程。需补齐授权额度、拒签、切链、gas、交易失败/替换、预言机过期、整池/资产暂停和冻结状态。真实按钮权限必须由链上状态决定。

本项目不实现合约、后端、keeper、管理员多签或真实清算，也不显示 LP 杠杆、E-Mode、积分与协议代币入口。

## 实现结构

`App.tsx` 页面切换与演示状态；`Dashboard.tsx` 仓位操作；`Markets.tsx` 市场；`Transaction.tsx` 操作弹窗；`AssetDetail.tsx` 风险详情；`components.tsx` 通用控件；`model.test.ts` 关键风控边界测试。

UI 建议继续使用 Radix + Tailwind 或逐步加入 shadcn/ui 组件；当前是自定义 Radix 组件，并未安装完整 shadcn 组件集合。保留品牌、资产、硬顶和利率参数为独立配置，最终上线前对齐产品与合约团队。
