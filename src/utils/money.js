/**
 * All money math happens in integer minor units (paise / cents) to avoid
 * floating-point drift. Callers pass/receive rupees as numbers (e.g. 1000.5)
 * for convenience, but every internal computation is done on integers.
 */

const MINOR_UNITS = 100; // 2 decimal places (paise/cents)

export function toMinorUnits(amount) {
  // Round to the nearest paisa before converting, so 10.005 doesn't become
  // 1000 due to binary floating point representation.
  return Math.round(Number(amount) * MINOR_UNITS);
}

export function fromMinorUnits(minor) {
  return Math.round(minor) / MINOR_UNITS;
}

export function formatCurrency(amount, currency = '₹') {
  const value = Number(amount) || 0;
  return `${currency}${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Split `totalAmount` equally among `participantIds`, distributing the
 * leftover paise one-by-one (deterministically, in participant order) so the
 * shares always sum EXACTLY to totalAmount.
 *
 * ₹100 / 3 -> [33.33, 33.33, 33.34]
 */
export function splitEqual(totalAmount, participantIds) {
  if (!participantIds || participantIds.length === 0) {
    throw new Error('At least one participant must be selected.');
  }
  const totalMinor = toMinorUnits(totalAmount);
  const n = participantIds.length;
  const base = Math.floor(totalMinor / n);
  let remainder = totalMinor - base * n;

  return participantIds.map((userId) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return {
      userId,
      shareAmount: fromMinorUnits(base + extra),
      sharePercentage: null,
    };
  });
}

/**
 * Validate a custom-amount split. Returns { valid, error, shares }.
 * Amounts must sum exactly to totalAmount (compared in minor units to avoid
 * float error).
 */
export function validateCustomSplit(totalAmount, shares) {
  if (!shares || shares.length === 0) {
    return { valid: false, error: 'At least one participant must be selected.' };
  }
  const totalMinor = toMinorUnits(totalAmount);
  let sumMinor = 0;
  for (const s of shares) {
    if (s.amount == null || Number.isNaN(Number(s.amount)) || Number(s.amount) < 0) {
      return { valid: false, error: 'Each share must be a valid, non-negative amount.' };
    }
    sumMinor += toMinorUnits(s.amount);
  }
  if (sumMinor !== totalMinor) {
    const diff = fromMinorUnits(sumMinor - totalMinor);
    return {
      valid: false,
      error: `Split amounts total ${formatCurrency(fromMinorUnits(sumMinor))}, which is ${
        diff > 0 ? 'more' : 'less'
      } than the expense amount ${formatCurrency(totalAmount)} (${diff > 0 ? '+' : ''}${formatCurrency(diff)}).`,
    };
  }
  return {
    valid: true,
    shares: shares.map((s) => ({
      userId: s.userId,
      shareAmount: Number(s.amount),
      sharePercentage: null,
    })),
  };
}

/**
 * Validate a percentage split, then convert percentages into exact rupee
 * shares (again distributing leftover paise deterministically) so amounts
 * always sum to totalAmount even though percentages are imprecise.
 */
export function validatePercentageSplit(totalAmount, shares) {
  if (!shares || shares.length === 0) {
    return { valid: false, error: 'At least one participant must be selected.' };
  }
  let sumPercent = 0;
  for (const s of shares) {
    const pct = Number(s.percentage);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      return { valid: false, error: 'Each percentage must be between 0 and 100.' };
    }
    sumPercent += pct;
  }
  // Allow tiny floating point slop from user input, but require it to be
  // functionally 100%.
  if (Math.abs(sumPercent - 100) > 0.01) {
    return {
      valid: false,
      error: `Percentages total ${sumPercent.toFixed(2)}%, but must total 100%.`,
    };
  }

  const totalMinor = toMinorUnits(totalAmount);
  const raw = shares.map((s) => (Number(s.percentage) / 100) * totalMinor);
  const floors = raw.map(Math.floor);
  let remainder = totalMinor - floors.reduce((a, b) => a + b, 0);

  // Distribute remaining paise to the shares with the largest fractional
  // remainder first (the "largest remainder method"), for a fair,
  // deterministic distribution.
  const order = raw
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const minorShares = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k += 1) {
    minorShares[order[k].i] += 1;
    remainder -= 1;
  }

  return {
    valid: true,
    shares: shares.map((s, i) => ({
      userId: s.userId,
      shareAmount: fromMinorUnits(minorShares[i]),
      sharePercentage: Number(s.percentage),
    })),
  };
}

/**
 * Given a list of { userId, paid, owed } (rupees), return net balances in
 * rupees: net = paid - owed. Uses minor units internally.
 */
export function computeNetBalances(entries) {
  return entries.map(({ userId, paid, owed }) => {
    const netMinor = toMinorUnits(paid) - toMinorUnits(owed);
    return { userId, paid: Number(paid), owed: Number(owed), net: fromMinorUnits(netMinor) };
  });
}
