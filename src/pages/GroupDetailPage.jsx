import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Plus, LogOut, Receipt, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useExpenses } from '../hooks/useExpenses.js';
import { useBalances } from '../hooks/useBalances.js';
import * as groupsApi from '../services/groups.js';
import { leaveGroup } from '../services/groups.js';
import { formatCurrency } from '../utils/money.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import ExpenseListItem from '../components/expenses/ExpenseListItem.jsx';
import ExpenseForm from '../components/expenses/ExpenseForm.jsx';
import BalanceList from '../components/balances/BalanceList.jsx';
import SettlementSuggestions from '../components/balances/SettlementSuggestions.jsx';
import SettlementForm from '../components/settlements/SettlementForm.jsx';
import MembersList from '../components/groups/MembersList.jsx';
import InviteMemberForm from '../components/groups/InviteMemberForm.jsx';
import AiExpenseConfirm from '../components/ai/AiExpenseConfirm.jsx';
import { CATEGORIES } from '../services/expenses/index.js';

const TABS = ['Overview', 'Expenses', 'Balances', 'Members'];
const TAB_BY_PATH_SUFFIX = { expenses: 'Expenses', balances: 'Balances', members: 'Members' };

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = useMemo(() => {
    const suffix = location.pathname.split('/').pop();
    return TAB_BY_PATH_SUFFIX[suffix] || 'Overview';
  }, [location.pathname]);
  const [tab, setTab] = useState(initialTab);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAiEntry, setShowAiEntry] = useState(false);
  const [settlementDraft, setSettlementDraft] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [memberFilter, setMemberFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');

  const { expenses, loading: expensesLoading, reload: reloadExpenses } = useExpenses(groupId);
  const { balances, suggestions, totalExpenses, loading: balancesLoading, reload: reloadBalances } = useBalances(groupId);

  const loadGroup = useCallback(async () => {
    const [g, m] = await Promise.all([groupsApi.getGroup(groupId), groupsApi.listGroupMembers(groupId)]);
    setGroup(g);
    setMembers(m);
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  async function refreshAll() {
    await Promise.all([reloadExpenses(), reloadBalances(), loadGroup()]);
  }

  async function handleLeave() {
    await leaveGroup(groupId, user.id);
    navigate('/groups');
  }

  const myBalance = balances.find((b) => b.userId === user.id);

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q));
    }
    if (categoryFilter !== 'All') result = result.filter((e) => e.category === categoryFilter);
    if (memberFilter !== 'All') result = result.filter((e) => e.paid_by === memberFilter);
    result.sort((a, b) => {
      const diff = new Date(a.expense_date) - new Date(b.expense_date);
      return sortOrder === 'newest' ? -diff : diff;
    });
    return result;
  }, [expenses, search, categoryFilter, memberFilter, sortOrder]);

  if (!group) return <Spinner className="mt-10" />;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{group.name}</h1>
          {group.description && <p className="mt-0.5 text-sm text-gray-500">{group.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAiEntry(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
            title="Add an expense by describing it in plain language"
          >
            <Sparkles className="h-3.5 w-3.5" /> Quick add
          </button>
          <button onClick={() => setConfirmLeave(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500">
            <LogOut className="h-3.5 w-3.5" /> Leave
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'Overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <p className="text-xs font-medium text-gray-400">Total group expenses</p>
                <p className="mt-1 text-xl font-semibold text-gray-800">{formatCurrency(totalExpenses)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-gray-400">Your balance</p>
                <p
                  className={`mt-1 text-xl font-semibold ${
                    (myBalance?.net ?? 0) > 0 ? 'text-owed-dark' : (myBalance?.net ?? 0) < 0 ? 'text-owe-dark' : 'text-gray-700'
                  }`}
                >
                  {(myBalance?.net ?? 0) > 0 ? '+' : ''}
                  {formatCurrency(myBalance?.net ?? 0)}
                </p>
              </Card>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Recent expenses</h2>
              <Button onClick={() => setShowExpenseForm(true)} className="px-3 py-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add expense
              </Button>
            </div>
            {expensesLoading ? (
              <Spinner />
            ) : expenses.length === 0 ? (
              <EmptyState icon={Receipt} title="No expenses yet" description="Add your first shared expense." />
            ) : (
              <Card className="divide-y divide-gray-100">
                {expenses.slice(0, 5).map((e) => (
                  <ExpenseListItem key={e.id} expense={e} />
                ))}
              </Card>
            )}

            <h2 className="text-sm font-semibold text-gray-700">Suggested settlements</h2>
            {balancesLoading ? <Spinner /> : <SettlementSuggestions suggestions={suggestions} onRecord={setSettlementDraft} />}
          </div>
        )}

        {tab === 'Expenses' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search expenses…"
                  className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-2.5 py-2 text-sm text-gray-600"
              >
                <option value="All">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-2.5 py-2 text-sm text-gray-600"
              >
                <option value="All">All members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="rounded-xl border border-gray-200 px-2.5 py-2 text-sm text-gray-600"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <Button onClick={() => setShowExpenseForm(true)} className="px-3 py-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add expense
              </Button>
            </div>
            {expensesLoading ? (
              <Spinner />
            ) : filteredExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={expenses.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
              />
            ) : (
              <Card className="divide-y divide-gray-100">
                {filteredExpenses.map((e) => (
                  <ExpenseListItem key={e.id} expense={e} />
                ))}
              </Card>
            )}
          </div>
        )}

        {tab === 'Balances' && (
          <div className="space-y-4">
            {balancesLoading ? (
              <Spinner />
            ) : (
              <>
                <BalanceList balances={balances} currentUserId={user.id} />
                <h2 className="text-sm font-semibold text-gray-700">Suggested settlements</h2>
                <SettlementSuggestions suggestions={suggestions} onRecord={setSettlementDraft} />
                {!settlementDraft && (
                  <Button variant="secondary" onClick={() => setSettlementDraft({})} className="w-full">
                    Record a settlement
                  </Button>
                )}
              </>
            )}
            {settlementDraft && (
              <SettlementForm
                groupId={groupId}
                members={members}
                createdBy={user.id}
                initial={settlementDraft}
                onCancel={() => setSettlementDraft(null)}
                onSaved={async () => {
                  setSettlementDraft(null);
                  await reloadBalances();
                }}
              />
            )}
          </div>
        )}

        {tab === 'Members' && (
          <div className="space-y-4">
            <MembersList members={members} />
            <Card className="p-4">
              <InviteMemberForm groupId={groupId} invitedBy={user.id} />
            </Card>
          </div>
        )}
      </div>

      {showExpenseForm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center" onClick={() => setShowExpenseForm(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-semibold text-gray-800">Add expense</h3>
            <ExpenseForm
              groupId={groupId}
              members={members}
              currentUserId={user.id}
              createdBy={user.id}
              onCancel={() => setShowExpenseForm(false)}
              onSaved={async () => {
                setShowExpenseForm(false);
                await refreshAll();
              }}
            />
          </div>
        </div>
      )}

      {showAiEntry && (
        <AiExpenseConfirm
          groupId={groupId}
          members={members}
          currentUserId={user.id}
          onClose={() => setShowAiEntry(false)}
          onSaved={async () => {
            setShowAiEntry(false);
            await refreshAll();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmLeave}
        title="Leave this group?"
        description="You'll lose access to its expenses and balances until someone re-invites you."
        confirmLabel="Leave group"
        danger
        onCancel={() => setConfirmLeave(false)}
        onConfirm={handleLeave}
      />
    </div>
  );
}
