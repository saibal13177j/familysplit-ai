export function validateExpenseAmount(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return 'Enter a valid amount.';
  if (n <= 0) return 'Amount must be greater than 0.';
  return null;
}

export function validateSettlementAmount(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return 'Enter a valid amount.';
  if (n <= 0) return 'Settlement amount must be greater than 0.';
  return null;
}

export function validateGroupName(name) {
  if (!name || !name.trim()) return 'Group name is required.';
  if (name.trim().length > 80) return 'Group name must be under 80 characters.';
  return null;
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !re.test(email)) return 'Enter a valid email address.';
  return null;
}

export function validateParticipants(participantIds) {
  if (!participantIds || participantIds.length === 0) {
    return 'Select at least one participant.';
  }
  return null;
}

export function validatePaidByIsMember(paidById, memberIds) {
  if (!memberIds.includes(paidById)) {
    return 'The person who paid must be a group member.';
  }
  return null;
}

export function validatePassword(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}
