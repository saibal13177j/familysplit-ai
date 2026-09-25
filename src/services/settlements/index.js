import { supabase } from '../supabase/client.js';
import { validateSettlementAmount } from '../../utils/validation.js';

export async function listGroupSettlements(groupId) {
  const { data, error } = await supabase
    .from('settlements')
    .select(
      '*, payer:profiles!settlements_payer_id_fkey(id, full_name, avatar_url), receiver:profiles!settlements_receiver_id_fkey(id, full_name, avatar_url)'
    )
    .eq('group_id', groupId)
    .order('settlement_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function recordSettlement({ groupId, payerId, receiverId, amount, note, settlementDate, createdBy }) {
  const amountError = validateSettlementAmount(amount);
  if (amountError) throw new Error(amountError);
  if (payerId === receiverId) throw new Error('Payer and receiver must be different people.');

  const { data, error } = await supabase
    .from('settlements')
    .insert({
      group_id: groupId,
      payer_id: payerId,
      receiver_id: receiverId,
      amount,
      note: note ?? '',
      settlement_date: settlementDate,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSettlement(settlementId) {
  const { error } = await supabase.from('settlements').delete().eq('id', settlementId);
  if (error) throw error;
}
