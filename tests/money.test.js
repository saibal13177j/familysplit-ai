import { describe, it, expect } from 'vitest';
import {
  splitEqual,
  validateCustomSplit,
  validatePercentageSplit,
  computeNetBalances,
  toMinorUnits,
  fromMinorUnits,
  formatCurrency,
} from '../src/utils/money.js';

const sum = (shares) => shares.reduce((acc, s) => acc + toMinorUnits(s.shareAmount), 0);

describe('minor unit conversion', () => {
  it('round-trips cleanly', () => {
    expect(toMinorUnits(33.33)).toBe(3333);
    expect(fromMinorUnits(3333)).toBe(33.33);
  });

  it('formats currency with 2 decimals and grouping', () => {
    expect(formatCurrency(1000)).toBe('₹1,000.00');
  });
});

describe('splitEqual', () => {
  it('splits evenly when it divides cleanly (2 people)', () => {
    const shares = splitEqual(1000, ['a', 'b']);
    expect(shares.map((s) => s.shareAmount)).toEqual([500, 500]);
    expect(sum(shares)).toBe(toMinorUnits(1000));
  });

  it('handles the classic 1000/3 rounding case', () => {
    const shares = splitEqual(1000, ['saibal', 'rahul', 'maya']);
    expect(shares.map((s) => s.shareAmount)).toEqual([333.34, 333.33, 333.33]);
    expect(sum(shares)).toBe(toMinorUnits(1000));
  });

  it('splits correctly for 4 people', () => {
    const shares = splitEqual(999, ['a', 'b', 'c', 'd']);
    expect(sum(shares)).toBe(toMinorUnits(999));
    expect(shares.every((s) => Math.abs(s.shareAmount - 249.75) < 0.01)).toBe(true);
  });

  it('splits correctly for 7 people with leftover paise', () => {
    const shares = splitEqual(100, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(sum(shares)).toBe(toMinorUnits(100));
    // 100 / 7 = 14.2857..., in paise: 10000 / 7 = 1428 remainder 4
    const amounts = shares.map((s) => s.shareAmount).sort((a, b) => b - a);
    expect(amounts.slice(0, 4)).toEqual([14.29, 14.29, 14.29, 14.29]);
    expect(amounts.slice(4)).toEqual([14.28, 14.28, 14.28]);
  });

  it('throws with no participants', () => {
    expect(() => splitEqual(100, [])).toThrow();
  });

  it('handles a single participant getting the whole amount', () => {
    const shares = splitEqual(1000, ['solo']);
    expect(shares).toEqual([{ userId: 'solo', shareAmount: 1000, sharePercentage: null }]);
  });
});

describe('validateCustomSplit', () => {
  it('accepts an exact match', () => {
    const result = validateCustomSplit(1000, [
      { userId: 'saibal', amount: 500 },
      { userId: 'rahul', amount: 300 },
      { userId: 'maya', amount: 200 },
    ]);
    expect(result.valid).toBe(true);
    expect(sum(result.shares)).toBe(toMinorUnits(1000));
  });

  it('rejects a total that is short', () => {
    const result = validateCustomSplit(1000, [
      { userId: 'a', amount: 500 },
      { userId: 'b', amount: 400 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/less than/);
  });

  it('rejects a total that overshoots', () => {
    const result = validateCustomSplit(1000, [
      { userId: 'a', amount: 700 },
      { userId: 'b', amount: 400 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/more than/);
  });

  it('rejects negative amounts', () => {
    const result = validateCustomSplit(1000, [{ userId: 'a', amount: -5 }]);
    expect(result.valid).toBe(false);
  });

  it('is robust to floating point noise (0.1 + 0.2 style cases)', () => {
    const result = validateCustomSplit(1, [
      { userId: 'a', amount: 0.1 },
      { userId: 'b', amount: 0.2 },
      { userId: 'c', amount: 0.7 },
    ]);
    expect(result.valid).toBe(true);
  });
});

describe('validatePercentageSplit', () => {
  it('accepts percentages that total exactly 100', () => {
    const result = validatePercentageSplit(1000, [
      { userId: 'saibal', percentage: 50 },
      { userId: 'rahul', percentage: 30 },
      { userId: 'maya', percentage: 20 },
    ]);
    expect(result.valid).toBe(true);
    expect(result.shares.map((s) => s.shareAmount)).toEqual([500, 300, 200]);
    expect(sum(result.shares)).toBe(toMinorUnits(1000));
  });

  it('rejects percentages that do not total 100', () => {
    const result = validatePercentageSplit(1000, [
      { userId: 'a', percentage: 50 },
      { userId: 'b', percentage: 40 },
    ]);
    expect(result.valid).toBe(false);
  });

  it('distributes rounding remainder fairly for an uneven 3-way split', () => {
    // 100 / 3 people at 33.33% each -> 99.99%, adjust last to 33.34
    const result = validatePercentageSplit(100, [
      { userId: 'a', percentage: 33.33 },
      { userId: 'b', percentage: 33.33 },
      { userId: 'c', percentage: 33.34 },
    ]);
    expect(result.valid).toBe(true);
    expect(sum(result.shares)).toBe(toMinorUnits(100));
  });

  it('rejects a percentage outside 0-100', () => {
    const result = validatePercentageSplit(1000, [
      { userId: 'a', percentage: 120 },
      { userId: 'b', percentage: -20 },
    ]);
    expect(result.valid).toBe(false);
  });

  it('handles a 7-way percentage split without losing money', () => {
    const shares = Array.from({ length: 7 }, (_, i) => ({
      userId: `u${i}`,
      percentage: i === 6 ? 100 - 6 * 14.28 : 14.28,
    }));
    const result = validatePercentageSplit(777.77, shares);
    expect(result.valid).toBe(true);
    expect(sum(result.shares)).toBe(toMinorUnits(777.77));
  });
});

describe('computeNetBalances', () => {
  it('computes paid - owed correctly (one payer, equal 3-way split of 1500)', () => {
    const result = computeNetBalances([
      { userId: 'saibal', paid: 1500, owed: 500 },
      { userId: 'rahul', paid: 0, owed: 500 },
      { userId: 'maya', paid: 0, owed: 500 },
    ]);
    const net = Object.fromEntries(result.map((r) => [r.userId, r.net]));
    expect(net.saibal).toBe(1000);
    expect(net.rahul).toBe(-500);
    expect(net.maya).toBe(-500);
    // Zero-sum: every rupee owed maps to a rupee someone is owed.
    expect(result.reduce((acc, r) => acc + r.net, 0)).toBeCloseTo(0, 2);
  });
});
