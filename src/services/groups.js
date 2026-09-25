import { supabase } from './supabase/client.js';

export async function listMyGroups() {
  // group_members RLS already scopes this to the current user's rows.
  const { data, error } = await supabase
    .from('group_members')
    .select('role, joined_at, groups(id, name, description, created_by, created_at)')
    .order('joined_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row.groups, myRole: row.role }));
}

export async function getGroup(groupId) {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single();
  if (error) throw error;
  return data;
}

export async function createGroup({ name, description, userId }) {
  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name, description, created_by: userId })
    .select()
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, role: 'owner' });
  if (memberError) throw memberError;

  return group;
}

export async function leaveGroup(groupId, userId) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function listGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('group_members')
    .select('id, role, joined_at, user_id, profiles(id, full_name, email, avatar_url)')
    .eq('group_id', groupId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    membershipId: row.id,
    role: row.role,
    joinedAt: row.joined_at,
    ...row.profiles,
  }));
}

export async function inviteMember({ groupId, email, invitedBy }) {
  const { data, error } = await supabase
    .from('invitations')
    .insert({ group_id: groupId, email: email.trim().toLowerCase(), invited_by: invitedBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listGroupInvitations(groupId) {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMyPendingInvitations(email) {
  const { data, error } = await supabase
    .from('invitations')
    .select('*, groups(name, description)')
    .eq('status', 'pending')
    .eq('email', email.trim().toLowerCase());
  if (error) throw error;
  return data ?? [];
}

export async function respondToInvitation({ invitationId, groupId, userId, accept }) {
  const { error: updateError } = await supabase
    .from('invitations')
    .update({ status: accept ? 'accepted' : 'rejected', responded_at: new Date().toISOString() })
    .eq('id', invitationId);
  if (updateError) throw updateError;

  if (accept) {
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: userId, role: 'member' });
    if (memberError) throw memberError;
  }
}
