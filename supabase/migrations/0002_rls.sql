-- FamilySplit AI - Row Level Security
-- Every private table is locked down; a user can only ever see data for
-- groups they belong to. Helper functions are SECURITY DEFINER so that
-- policies can check membership without recursively re-triggering RLS on
-- group_members (which would otherwise deadlock the policy check).

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.invitations enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- profiles: everyone can read a minimal profile (needed to show "paid by
-- Maya" to other group members); a user can only edit their own row.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- groups: visible only to members; creation allowed to any signed-in user
-- (they become the owner immediately after, via group_members insert).
drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member"
  on public.groups for select
  using (public.is_group_member(id, auth.uid()));

drop policy if exists "groups_insert_authenticated" on public.groups;
create policy "groups_insert_authenticated"
  on public.groups for insert
  with check (auth.uid() = created_by);

drop policy if exists "groups_update_owner" on public.groups;
create policy "groups_update_owner"
  on public.groups for update
  using (public.is_group_owner(id, auth.uid()));

drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner"
  on public.groups for delete
  using (public.is_group_owner(id, auth.uid()));

-- group_members: members can see the roster of their own groups. Only the
-- owner can add/remove members; any member can remove themself (leave).
drop policy if exists "group_members_select_member" on public.group_members;
create policy "group_members_select_member"
  on public.group_members for select
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "group_members_insert_owner_or_self" on public.group_members;
create policy "group_members_insert_owner_or_self"
  on public.group_members for insert
  with check (
    public.is_group_owner(group_id, auth.uid())
    or user_id = auth.uid() -- accepting an invitation adds yourself
  );

drop policy if exists "group_members_delete_owner_or_self" on public.group_members;
create policy "group_members_delete_owner_or_self"
  on public.group_members for delete
  using (
    public.is_group_owner(group_id, auth.uid())
    or user_id = auth.uid() -- leave group
  );

-- invitations: visible to the group's members (to manage) and to the
-- invited email address (to accept/reject). Only members can create one.
drop policy if exists "invitations_select_member_or_invitee" on public.invitations;
create policy "invitations_select_member_or_invitee"
  on public.invitations for select
  using (
    public.is_group_member(group_id, auth.uid())
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "invitations_insert_member" on public.invitations;
create policy "invitations_insert_member"
  on public.invitations for insert
  with check (public.is_group_member(group_id, auth.uid()) and invited_by = auth.uid());

drop policy if exists "invitations_update_member_or_invitee" on public.invitations;
create policy "invitations_update_member_or_invitee"
  on public.invitations for update
  using (
    public.is_group_member(group_id, auth.uid())
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- expenses: visible/creatable only by group members.
drop policy if exists "expenses_select_member" on public.expenses;
create policy "expenses_select_member"
  on public.expenses for select
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "expenses_insert_member" on public.expenses;
create policy "expenses_insert_member"
  on public.expenses for insert
  with check (public.is_group_member(group_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "expenses_update_member" on public.expenses;
create policy "expenses_update_member"
  on public.expenses for update
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "expenses_delete_member" on public.expenses;
create policy "expenses_delete_member"
  on public.expenses for delete
  using (public.is_group_member(group_id, auth.uid()));

-- expense_splits: visible/creatable only to members of the expense's group.
drop policy if exists "expense_splits_select_member" on public.expense_splits;
create policy "expense_splits_select_member"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_group_member(e.group_id, auth.uid())
    )
  );

drop policy if exists "expense_splits_insert_member" on public.expense_splits;
create policy "expense_splits_insert_member"
  on public.expense_splits for insert
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_group_member(e.group_id, auth.uid())
    )
  );

drop policy if exists "expense_splits_update_member" on public.expense_splits;
create policy "expense_splits_update_member"
  on public.expense_splits for update
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_group_member(e.group_id, auth.uid())
    )
  );

drop policy if exists "expense_splits_delete_member" on public.expense_splits;
create policy "expense_splits_delete_member"
  on public.expense_splits for delete
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_group_member(e.group_id, auth.uid())
    )
  );

-- settlements: visible/creatable only by group members.
drop policy if exists "settlements_select_member" on public.settlements;
create policy "settlements_select_member"
  on public.settlements for select
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "settlements_insert_member" on public.settlements;
create policy "settlements_insert_member"
  on public.settlements for insert
  with check (public.is_group_member(group_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "settlements_delete_member" on public.settlements;
create policy "settlements_delete_member"
  on public.settlements for delete
  using (public.is_group_member(group_id, auth.uid()));
