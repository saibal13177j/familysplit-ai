import { describe, it, expect } from 'vitest';
import { suggestSettlements, applySettlements } from '../src/utils/settlement.js';
import { toMinorUnits } from '../src/utils/money.js';

function totalMinorMoved(transactions) {
  return transactions.reduce((acc, t) => acc + toMinorUnits(t.amount), 0);
}

function netFromTransactions(balances, transactions) {
  const net = Object.fromEntries(balances.map((b) => [b.userId, 0]));
  for (const t of transactions) {
    net[t.from] -= t.amount;
    net[t.to] += t.amount;
  }
  return net;
}

describe('suggestSettlements', () => {
  it('produces the README example: A owes B 500, C owes B 300, D owes C 200', () => {
    // Net effect: B is owed 800, C nets +100 (owed 300, owes 200), D owes 200.
    const balances = [
      { userId: 'A', net: -500 },
      { userId: 'B', net: 800 },
      { userId: 'C', net: -100 },
      { userId: 'D', net: -200 },
    ];
    const txns = suggestSettlements(balances);
    // Money conservation: total paid == total owed.
    const totalPositive = balances.filter((b) => b.net > 0).reduce((a, b) => a + b.net, 0);
    expect(totalMinorMoved(txns)).toBe(toMinorUnits(totalPositive));

    // Reconstructed net balances from suggested transactions must match input.
    const reconstructed = netFromTransactions(balances, txns);
    for (const b of balances) {
      expect(reconstructed[b.userId]).toBeCloseTo(b.net, 2);
    }
  });

  it('is a no-op when everyone is already settled', () => {
    const balances = [
      { userId: 'a', net: 0 },
      { userId: 'b', net: 0 },
    ];
    expect(suggestSettlements(balances)).toEqual([]);
  });

  it('handles a simple 2-person debt', () => {
    const balances = [
      { userId: 'a', net: -500 },
      { userId: 'b', net: 500 },
    ];
    const txns = suggestSettlements(balances);
    expect(txns).toEqual([{ from: 'a', to: 'b', amount: 500 }]);
  });

  it('minimizes transactions for a 4-person group vs. naive pairwise settling', () => {
    // Saibal is owed 500 total; Rahul and Maya each owe 250, split evenly.
    const balances = [
      { userId: 'saibal', net: 500 },
      { userId: 'rahul', net: -250 },
      { userId: 'maya', net: -250 },
      { userId: 'riya', net: 0 },
    ];
    const txns = suggestSettlements(balances);
    expect(txns.length).toBe(2);
    expect(totalMinorMoved(txns)).toBe(toMinorUnits(500));
  });

  it('is deterministic: running twice on the same input gives the same result', () => {
    const balances = [
      { userId: 'x', net: -333.33 },
      { userId: 'y', net: 133.33 },
      { userId: 'z', net: 200 },
    ];
    const first = suggestSettlements(balances);
    const second = suggestSettlements(balances);
    expect(first).toEqual(second);
  });

  it('never creates or loses money across a larger 7-person group', () => {
    const balances = [
      { userId: 'p1', net: 1200.5 },
      { userId: 'p2', net: -300.25 },
      { userId: 'p3', net: -450.1 },
      { userId: 'p4', net: 150 },
      { userId: 'p5', net: -600.15 },
      { userId: 'p6', net: 0 },
      { userId: 'p7', net: 0 },
    ];
    const txns = suggestSettlements(balances);
    const reconstructed = netFromTransactions(balances, txns);
    for (const b of balances) {
      expect(reconstructed[b.userId]).toBeCloseTo(b.net, 2);
    }
  });
});

describe('applySettlements', () => {
  it('reduces a debtor balance to zero after a matching settlement', () => {
    const expenseBalances = [
      { userId: 'saibal', net: 500 },
      { userId: 'rahul', net: -500 },
    ];
    const settlements = [{ payer_id: 'rahul', receiver_id: 'saibal', amount: 500 }];
    const result = applySettlements(expenseBalances, settlements);
    const net = Object.fromEntries(result.map((r) => [r.userId, r.net]));
    expect(net.rahul).toBe(0);
    expect(net.saibal).toBe(0);
  });

  it('handles a partial settlement', () => {
    const expenseBalances = [
      { userId: 'saibal', net: 500 },
      { userId: 'rahul', net: -500 },
    ];
    const settlements = [{ payer_id: 'rahul', receiver_id: 'saibal', amount: 200 }];
    const result = applySettlements(expenseBalances, settlements);
    const net = Object.fromEntries(result.map((r) => [r.userId, r.net]));
    expect(net.rahul).toBe(-300);
    expect(net.saibal).toBe(300);
  });

  it('keeps the group zero-sum after multiple settlements', () => {
    const expenseBalances = [
      { userId: 'a', net: 800 },
      { userId: 'b', net: -500 },
      { userId: 'c', net: -300 },
    ];
    const settlements = [
      { payer_id: 'b', receiver_id: 'a', amount: 500 },
      { payer_id: 'c', receiver_id: 'a', amount: 300 },
    ];
    const result = applySettlements(expenseBalances, settlements);
    const total = result.reduce((acc, r) => acc + r.net, 0);
    expect(total).toBeCloseTo(0, 2);
    expect(result.every((r) => r.net === 0)).toBe(true);
  });
});
