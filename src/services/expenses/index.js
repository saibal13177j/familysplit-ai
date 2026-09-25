import { supabase } from '../supabase/client.js';
import { splitEqual, validateCustomSplit, validatePercentageSplit } from '../../utils/money.js';
import { validateExpenseAmount, validateParticipants } from '../../utils/validation.js';

export const CATEGORIES = [
  'Food',
  'Groceries',
  'Rent',
  'Utilities',
  'Electricity',
  'Internet',
  'Travel',
  'Shopping',
  'Entertainment',
  'Medical',
  'Education',
  'Other',
];

/**
 * Compute the split rows for an expense given the chosen split type.
 * Throws a descriptive error if validation fails - callers should catch and
 * surface it, never submit an invalid split.
 */
export function computeSplitRows({ splitType, amount, participants }) {
  const amountError = validateExpenseAmount(amount);
  if (amountError) throw new Error(amountError);
  const participantError = validateParticipants(participants.map((p) => p.userId));
  if (participantError) throw new Error(participantError);

  if (splitType === 'equal') {
    return splitEqual(amount, participants.map((p) => p.userId));
  }
  if (splitType === 'amount') {
    const result = validateCustomSplit(amount, participants.map((p) => ({ userId: p.userId, amount: p.amount })));
    if (!result.valid) throw new Error(result.error);
    return result.shares;
  }
  if (splitType === 'percentage') {
    const result = validatePercentageSplit(
      amount,
      participants.map((p) => ({ userId: p.userId, percentage: p.percentage }))
    );
    if (!result.valid) throw new Error(result.error);
    return result.shares;
  }
  throw new Error(`Unknown split type: ${splitType}`);
}

export async function listGroupExpenses(groupId, { limit } = {}) {
  let query = supabase
    .from('expenses')
    .select('*, paid_by_profile:profiles!expenses_paid_by_fkey(id, full_name, avatar_url)')
    .eq('group_id', groupId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getExpenseWithSplits(expenseId) {
  const { data: expense, error } = await supabase
    .from('expenses')
    .select('*, paid_by_profile:profiles!expenses_paid_by_fkey(id, full_name, avatar_url)')
    .eq('id', expenseId)
    .single();
  if (error) throw error;

  const { data: splits, error: splitsError } = await supabase
    .from('expense_splits')
    .select('*, profiles(id, full_name, avatar_url)')
    .eq('expense_id', expenseId);
  if (splitsError) throw splitsError;

  return { ...expense, splits: splits ?? [] };
}

export async function createExpense({
  groupId,
  paidBy,
  title,
  description,
  amount,
  category,
  splitType,
  expenseDate,
  participants,
  createdBy,
}) {
  const shares = computeSplitRows({ splitType, amount, participants });

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      group_id: groupId,
      paid_by: paidBy,
      title,
      description: description ?? '',
      amount,
      category: category ?? 'Other',
      split_type: splitType,
      expense_date: expenseDate,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;

  const splitRows = shares.map((s) => ({
    expense_id: expense.id,
    user_id: s.userId,
    share_amount: s.shareAmount,
    share_percentage: s.sharePercentage,
  }));
  const { error: splitsError } = await supabase.from('expense_splits').insert(splitRows);
  if (splitsError) {
    // Roll back the expense so we never leave an expense with no splits.
    await supabase.from('expenses').delete().eq('id', expense.id);
    throw splitsError;
  }

  return expense;
}

export async function updateExpense(expenseId, updates) {
  const { participants, splitType, amount, ...expenseFields } = updates;

  if (participants && splitType && amount != null) {
    const shares = computeSplitRows({ splitType, amount, participants });
    const { error: deleteError } = await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
    if (deleteError) throw deleteError;
    const splitRows = shares.map((s) => ({
      expense_id: expenseId,
      user_id: s.userId,
      share_amount: s.shareAmount,
      share_percentage: s.sharePercentage,
    }));
    const { error: insertError } = await supabase.from('expense_splits').insert(splitRows);
    if (insertError) throw insertError;
  }

  const { data, error } = await supabase
    .from('expenses')
    .update({ ...expenseFields, amount, split_type: splitType })
    .eq('id', expenseId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(expenseId) {
  // expense_splits cascade-deletes via the FK, no manual cleanup needed.
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}
