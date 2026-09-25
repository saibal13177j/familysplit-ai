-- FamilySplit AI - OPTIONAL development seed data
-- Do NOT run this against production. Run manually in the SQL editor of a
-- throwaway/dev Supabase project after you have created the 4 auth users
-- below (Auth -> Users -> Add user), since profiles are keyed to auth.users.
--
-- Replace the placeholder UUIDs with the real auth.users ids Supabase
-- assigns after you create: saibal@example.com, rahul@example.com,
-- maya@example.com, riya@example.com

do $$
declare
  v_saibal uuid := '00000000-0000-0000-0000-000000000001';
  v_rahul  uuid := '00000000-0000-0000-0000-000000000002';
  v_maya   uuid := '00000000-0000-0000-0000-000000000003';
  v_riya   uuid := '00000000-0000-0000-0000-000000000004';
  v_group  uuid;
  v_e1 uuid;
  v_e2 uuid;
  v_e3 uuid;
begin
  insert into public.groups (id, name, description, created_by)
  values (gen_random_uuid(), 'Family Expenses', 'Shared household costs', v_saibal)
  returning id into v_group;

  insert into public.group_members (group_id, user_id, role) values
    (v_group, v_saibal, 'owner'),
    (v_group, v_rahul, 'member'),
    (v_group, v_maya, 'member'),
    (v_group, v_riya, 'member');

  insert into public.expenses (id, group_id, paid_by, title, amount, category, split_type, created_by)
  values (gen_random_uuid(), v_group, v_saibal, 'Groceries', 2000, 'Groceries', 'equal', v_saibal)
  returning id into v_e1;
  insert into public.expense_splits (expense_id, user_id, share_amount)
  values (v_e1, v_saibal, 500), (v_e1, v_rahul, 500), (v_e1, v_maya, 500), (v_e1, v_riya, 500);

  insert into public.expenses (id, group_id, paid_by, title, amount, category, split_type, created_by)
  values (gen_random_uuid(), v_group, v_rahul, 'Electricity Bill', 3500, 'Electricity', 'equal', v_rahul)
  returning id into v_e2;
  insert into public.expense_splits (expense_id, user_id, share_amount)
  values (v_e2, v_saibal, 875), (v_e2, v_rahul, 875), (v_e2, v_maya, 875), (v_e2, v_riya, 875);

  insert into public.expenses (id, group_id, paid_by, title, amount, category, split_type, created_by)
  values (gen_random_uuid(), v_group, v_maya, 'Dinner', 1200, 'Food', 'equal', v_maya)
  returning id into v_e3;
  insert into public.expense_splits (expense_id, user_id, share_amount)
  values (v_e3, v_saibal, 400), (v_e3, v_maya, 400), (v_e3, v_riya, 400);
end $$;
