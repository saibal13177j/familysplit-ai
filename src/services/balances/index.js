import { supabase } from '../supabase/client.js';
import { computeNetBalances } from '../../utils/money.js';
import { suggestSettlements, applySettlements } from '../../utils/settlement.js';

/**
 * Compute full balance state for a group: per-member paid/owed/net, the
 * suggested minimal settlements, and totals for the group dashboard.
 *
 * This is pure application logic over data pulled from Supabase - never AI.
 */
export async function getGroupBalances(groupId) {
  const [{ data: expenses, error: expError }, { data: splits, error: splitError }, { data: settlements, error: settleError }, { data: members, error: memberError }] =
    await Promise.all([
      supabase.from('expenses').select('id, paid_by, amount').eq('group_id', groupId),
      supabase
        .from('expense_splits')
        .select('user_id, share_amount, expense_id, expenses!inner(group_id)')
        .eq('expenses.group_id', groupId),
      supabase.from('settlements').select('*').eq('group_id', groupId),
      supabase
        .from('group_members')
        .select('user_id, profiles(id, full_name, avatar_url, email)')
        .eq('group_id', groupId),
    ]);

  if (expError) throw expError;
  if (splitError) throw splitError;
  if (settleError) throw settleError;
  if (memberError) throw memberError;

  const memberIds = (members ?? []).map((m) => m.user_id);
  const paidTotals = new Map(memberIds.map((id) => [id, 0]));
  const owedTotals = new Map(memberIds.map((id) => [id, 0]));

  for (const exp of expenses ?? []) {
    paidTotals.set(exp.paid_by, (paidTotals.get(exp.paid_by) ?? 0) + Number(exp.amount));
  }
  for (const split of splits ?? []) {
    owedTotals.set(split.user_id, (owedTotals.get(split.user_id) ?? 0) + Number(split.share_amount));
  }

  const netBalances = computeNetBalances(
    memberIds.map((userId) => ({
      userId,
      paid: paidTotals.get(userId) ?? 0,
      owed: owedTotals.get(userId) ?? 0,
    }))
  );

  const afterSettlements = applySettlements(netBalances, settlements ?? []);

  const profileById = new Map((members ?? []).map((m) => [m.user_id, m.profiles]));
  const withProfiles = afterSettlements.map((b) => ({ ...b, profile: profileById.get(b.userId) }));

  const suggestions = suggestSettlements(afterSettlements).map((t) => ({
    ...t,
    fromProfile: profileById.get(t.from),
    toProfile: profileById.get(t.to),
  }));

  const totalExpenses = (expenses ?? []).reduce((acc, e) => acc + Number(e.amount), 0);

  return {
    balances: withProfiles,
    suggestions,
    totalExpenses,
    expenseCount: (expenses ?? []).length,
  };
}

/** Aggregate balances across every group the user belongs to, for the dashboard. */
export async function getDashboardSummary(userId) {
  const { data: memberships, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);
  if (error) throw error;

  const groupIds = (memberships ?? []).map((m) => m.group_id);
  let totalOwe = 0;
  let totalOwed = 0;

  const perGroup = await Promise.all(
    groupIds.map(async (groupId) => {
      const { balances } = await getGroupBalances(groupId);
      const mine = balances.find((b) => b.userId === userId);
      const net = mine?.net ?? 0;
      if (net > 0) totalOwed += net;
      if (net < 0) totalOwe += Math.abs(net);
      return { groupId, net };
    })
  );

  return {
    totalOwe,
    totalOwed,
    net: totalOwed - totalOwe,
    groupCount: groupIds.length,
    perGroup,
  };
}
