import { supabase } from './supabase/client.js';

/**
 * Update the current user's profile row. RLS restricts this to the caller's
 * own row (see profiles_update_own policy), so no userId param is needed -
 * we always target auth.uid().
 */
export async function updateProfile({ userId, fullName, avatarUrl }) {
  const updates = {};
  if (fullName !== undefined) updates.full_name = fullName;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
