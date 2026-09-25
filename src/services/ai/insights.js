import { callAi, isAiAvailable } from './client.js';

/**
 * Generate a short natural-language spending summary/insight for a group.
 * Read-only and advisory - it summarizes numbers the app already computed
 * deterministically (see services/balances), it never produces the numbers
 * themselves.
 */
export async function getSpendingInsights({ groupId, monthlyTotals, categoryTotals }) {
  if (!isAiAvailable()) return null;

  const result = await callAi('spending_insights', { groupId, monthlyTotals, categoryTotals });
  if (!result?.summary) return null;
  return { summary: String(result.summary).slice(0, 500) };
}
