import { toMinorUnits, fromMinorUnits } from './money.js';

/**
 * Reduce a set of net balances to a minimal-ish set of suggested
 * transactions using a greedy "largest debtor pays largest creditor" pass.
 * This is the standard debt-simplification heuristic: it does not always
 * find the mathematically optimal minimum number of transactions (that
 * problem is NP-hard in general), but it is deterministic, fast, and never
 * creates or destroys money - the sum of every suggested transaction always
 * nets back to the input balances exactly.
 *
 * @param {Array<{userId: string, net: number}>} balances - net balance in
 *   rupees per user; positive = is owed money, negative = owes money.
 * @returns {Array<{from: string, to: string, amount: number}>}
 */
export function suggestSettlements(balances) {
  // Work in integer minor units throughout so nothing drifts.
  const creditors = [];
  const debtors = [];

  for (const b of balances) {
    const minor = toMinorUnits(b.net);
    if (minor > 0) creditors.push({ userId: b.userId, amount: minor });
    else if (minor < 0) debtors.push({ userId: b.userId, amount: -minor });
  }

  // Deterministic ordering: largest amount first, tie-broken by userId so
  // the result is stable across runs given the same input.
  const byAmountDesc = (a, b) => b.amount - a.amount || String(a.userId).localeCompare(String(b.userId));
  creditors.sort(byAmountDesc);
  debtors.sort(byAmountDesc);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: fromMinorUnits(amount),
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) i += 1;
    if (creditor.amount === 0) j += 1;
  }

  return transactions;
}

/**
 * Apply recorded settlements on top of expense-derived net balances to get
 * the current outstanding balance per user.
 *
 * @param {Array<{userId: string, net: number}>} expenseNetBalances
 * @param {Array<{payer_id: string, receiver_id: string, amount: number}>} settlements
 */
export function applySettlements(expenseNetBalances, settlements) {
  const netMinor = new Map(expenseNetBalances.map((b) => [b.userId, toMinorUnits(b.net)]));

  for (const s of settlements) {
    const payerNet = netMinor.get(s.payer_id) ?? 0;
    const receiverNet = netMinor.get(s.receiver_id) ?? 0;
    const amountMinor = toMinorUnits(s.amount);
    // Paying down a debt: payer's net balance moves up (less negative),
    // receiver's net balance moves down (less positive).
    netMinor.set(s.payer_id, payerNet + amountMinor);
    netMinor.set(s.receiver_id, receiverNet - amountMinor);
  }

  return Array.from(netMinor.entries()).map(([userId, minor]) => ({
    userId,
    net: fromMinorUnits(minor),
  }));
}
