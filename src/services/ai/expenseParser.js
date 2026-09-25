import { callAi, isAiAvailable } from './client.js';

/**
 * Parse a natural-language expense description into structured fields the
 * UI can pre-fill. This NEVER creates an expense itself - the caller must
 * always show a confirmation screen and let the user edit/approve the
 * result before it is saved (see components/ai/AiExpenseConfirm.jsx).
 *
 * Returns null if AI is unavailable or parsing fails; the caller should
 * fall back to the normal manual expense form.
 */
export async function parseExpenseText(text, { groupMembers } = {}) {
  if (!isAiAvailable() || !text?.trim()) return null;

  const memberDirectory = (groupMembers ?? []).map((m) => ({ id: m.id, name: m.full_name }));

  const result = await callAi('parse_expense', { text, members: memberDirectory });
  if (!result || typeof result !== 'object') return null;

  // Defensive shape-check: never trust the AI response blindly.
  const { amount, title, paidBy, participantIds, category } = result;
  if (amount == null || Number.isNaN(Number(amount)) || Number(amount) <= 0) return null;

  return {
    amount: Number(amount),
    title: typeof title === 'string' ? title.slice(0, 120) : '',
    paidBy: memberDirectory.some((m) => m.id === paidBy) ? paidBy : null,
    participantIds: Array.isArray(participantIds)
      ? participantIds.filter((id) => memberDirectory.some((m) => m.id === id))
      : [],
    category: typeof category === 'string' ? category : null,
    needsConfirmation: true,
  };
}
