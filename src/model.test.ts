import { describe, expect, it } from "vitest";
import {
  assets,
  initial,
  empty,
  totals,
  maximum,
  preview,
  validate,
  liquidationPrice,
  reserve,
} from "./model";
describe("一期借贷模拟风控", () => {
  it("按不同清算阈值计算健康度", () => {
    expect(totals(initial).hf).toBeCloseTo(
      (5000 * 0.9 + 4900 * 0.8 + 1250 * 0.7) / 1800,
    );
  });
  it("空仓位不能借款，股票始终不可借", () => {
    expect(maximum("borrow", assets[0], empty)).toBe(0);
    expect(maximum("borrow", assets[2], initial)).toBe(0);
  });
  it("存入后钱包减少，抵押额度与储备同步增加", () => {
    const next = preview(initial, assets[0], "supply", 100, true);
    expect(next.USDG.wallet).toBe(initial.USDG.wallet - 100);
    expect(totals(next).limit - totals(initial).limit).toBeCloseTo(85);
    expect(reserve(assets[0], next).total - assets[0].total).toBe(100);
  });
  it("拦截超余额与非有限数量", () => {
    expect(validate(initial, assets[0], "supply", 999999)).toBeTruthy();
    expect(validate(initial, assets[0], "supply", Infinity)).toBeTruthy();
  });
  it("抵押开关导致危险时拒绝交易", () => {
    const p = structuredClone(empty);
    p.USDG.supplied = 100;
    p.USDG.debt = 80;
    expect(validate(p, assets[0], "supply", 1, false)).toContain("Health factor");
  });
  it("借款与全额还款闭环恢复本金余额", () => {
    const borrowed = preview(empty, assets[0], "borrow", 100);
    const repaid = preview(borrowed, assets[0], "repay", 100);
    expect(repaid).toEqual(empty);
  });
  it("提现受到健康度保护", () => {
    const p = structuredClone(empty);
    p.ETH.supplied = 1;
    p.USDG.debt = 1700;
    const max = maximum("withdraw", assets[1], p);
    expect(max).toBeLessThan(1);
    expect(totals(preview(p, assets[1], "withdraw", max)).hf).toBeCloseTo(1.01);
    expect(validate(p, assets[1], "withdraw", max + 0.01)).toBeTruthy();
  });
  it("利用率高时提现受到池子可用流动性约束", () => {
    const a = { ...assets[0], total: 2000, borrowed: 1990 };
    expect(maximum("withdraw", a, initial)).toBe(10);
  });
  it("存借硬顶限制可操作数量", () => {
    expect(
      maximum(
        "supply",
        { ...assets[0], supplyCap: assets[0].total + 5 },
        initial,
      ),
    ).toBe(5);
    expect(
      maximum(
        "borrow",
        { ...assets[0], borrowCap: assets[0].borrowed + 3 },
        initial,
      ),
    ).toBe(3);
  });
  it("单资产清算价格基于其他资产保持不变", () => {
    const p = structuredClone(empty);
    p.ETH.supplied = 1;
    p.USDG.debt = 1000;
    expect(liquidationPrice(assets[1], p)).toBe(1250);
    expect(liquidationPrice(assets[0], empty)).toBeNull();
  });
});
