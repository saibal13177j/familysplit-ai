# FamilySplit AI

A private, family-friendly expense-sharing web app: create groups, log shared
expenses, split them equally / by custom amount / by percentage, see who
owes whom at a glance, and settle up. Optional AI features (category
suggestions, natural-language entry, spending insights) are a thin advisory
layer — every dollar amount in the app is computed by deterministic
application code, never by AI.

Not affiliated with, and does not copy the branding, UI, or code of,
Splitwise or any other product.

## Features

- **Auth** — sign up, log in, log out, forgot/reset password, persistent
  sessions, protected routes, editable profile.
- **Groups** — create/join/leave groups, member roster, email invitations
  (pending / accepted / rejected).
- **Expenses** — title, description, amount, category, date, and a choice of
  three split types:
  - **Equal** — remainder pennies distributed deterministically so shares
    always sum exactly to the total.
  - **Custom amount** — must sum exactly to the expense total or the form
    blocks submission.
  - **Percentage** — must sum to 100%; converted to exact rupee shares using
    the largest-remainder method so rounding never leaks or invents money.
  - Any subset of the group's members can be selected as participants.
- **Balances** — net balance per member (`paid − owed`), a clear "who owes
  whom" list, and a settlement-suggestion algorithm that minimizes the
  number of payments needed to clear all debts.
- **Settlements** — record a repayment; balances recalculate immediately.
- **Expense history** — search, filter by category/member, sort by date,
  and a detail view showing the full per-person split.
- **Edit / delete expenses** — with a confirmation dialog before delete;
  balances always recalculate from the current data, never cached.
- **Dashboard** — total you owe, total owed to you, net balance, group
  count, recent activity.
- **AI (optional, off by default)**:
  - Category suggestion from a free-text title/description.
  - Natural-language "quick add" (e.g. *"Yesterday I paid 850 for dinner
    with Rahul and Maya"*) that pre-fills a form — **always shown to the
    user for review and explicit confirmation before anything is saved.**
  - Monthly spending insights (a plain-language summary of numbers the app
    already computed).
  - The app is 100% usable with AI fully disabled; nothing financial
    depends on it, and an AI failure never blocks expense creation.
- **Responsive** — sidebar nav + wide dashboard on desktop; bottom nav,
  floating add button, and bottom-sheet modals on mobile.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, React Router 6, Tailwind CSS, lucide-react |
| Backend | Supabase (PostgreSQL, Auth, Row Level Security) |
| Money math | Integer minor-units (paise/cents) throughout — see `src/utils/money.js` |
| Tests | Vitest |

## Folder structure

```
src/
  components/
    ai/          AiExpenseConfirm.jsx – natural-language entry + confirm screen
    auth/        AuthLayout
    balances/    BalanceList, SettlementSuggestions
    dashboard/
    expenses/    ExpenseForm, ExpenseListItem, categoryIcons
    groups/      GroupCard, MembersList, InviteMemberForm
    layout/      AppShell (sidebar + mobile nav)
    settlements/ SettlementForm
    ui/          Button, Card, Input, Avatar, Spinner, EmptyState, ErrorBanner, ConfirmDialog
  hooks/         useAuth, useGroups, useExpenses, useBalances
  pages/         Login/Signup/ForgotPassword/ResetPassword, Dashboard, Groups,
                 GroupDetail (Overview/Expenses/Balances/Members tabs),
                 ExpenseDetail, Activity, Profile, Settings
  routes/        ProtectedRoute
  services/
    supabase/    Supabase client
    groups.js    groups, membership, invitations
    expenses/    expense CRUD + split computation
    balances/    net-balance + dashboard aggregation (pure logic, no AI)
    settlements/ settlement CRUD
    ai/          client.js (fail-soft AI wrapper), categorizer, expenseParser, insights
    profile.js   profile updates
  utils/         money.js (split/rounding math), settlement.js (debt simplification),
                 validation.js
supabase/
  migrations/    0001_schema.sql, 0002_rls.sql
  seed.sql       optional dev seed data
tests/           money.test.js, settlement.test.js
```

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_schema.sql`, then
   `supabase/migrations/0002_rls.sql`.
3. (Optional) In **Authentication → Providers**, confirm email/password
   sign-up is enabled. If you want passwordless email confirmation off for
   local testing, disable "Confirm email" in Auth settings.
4. (Optional) Create a few auth users (**Authentication → Users → Add
   user**), then edit `supabase/seed.sql` with their real UUIDs and run it
   in the SQL editor to get sample data (`Family Expenses` group with
   Groceries/Electricity/Dinner expenses). Never run the seed against a
   production project.

## Environment variables

Copy `.env.example` to `.env` and fill in your project's values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional — only needed if you wire up AI features. NEVER put a secret
# provider key directly in a VITE_ variable (it ships to the browser). If
# your AI provider needs a secret key, put it in a Supabase Edge Function
# and point VITE_AI_ENDPOINT at that function instead.
VITE_AI_FEATURES_ENABLED=false
VITE_AI_ENDPOINT=
```

Only `VITE_*` values are ever exposed to the frontend. The Supabase service
role key and any AI provider secret must never appear in client code or a
`VITE_` variable.

## Run locally

```bash
npm install
cp .env.example .env   # then fill in your Supabase values
npm run dev
```

## Run tests

```bash
npm test          # single run
npm run test:watch
```

Covers equal/custom/percentage split math (including rounding for 2, 3, 4,
and 7-person splits and edge cases), net-balance calculation, and the
settlement-suggestion algorithm (determinism, and that it never creates or
loses money).

## Build for production

```bash
npm run build
npm run preview   # serve the production build locally to sanity-check it
```

## AI configuration

AI is entirely optional and off by default (`VITE_AI_FEATURES_ENABLED=false`).
To enable it:

1. Deploy a small backend (a Supabase Edge Function is the natural fit)
   that holds your AI provider's secret key and exposes a single endpoint
   accepting `{ task, payload }` for `categorize_expense`, `parse_expense`,
   and `spending_insights`.
2. Set `VITE_AI_FEATURES_ENABLED=true` and `VITE_AI_ENDPOINT` to that
   function's URL.

Every AI call (`src/services/ai/client.js`) fails soft — on any error,
timeout, or missing configuration it resolves to `null` rather than
throwing, so a flaky or absent AI backend can never break expense creation
or balance calculation. Financial math never touches the AI layer.

## Security notes

- Row Level Security is enabled on every table; policies restrict reads and
  writes to a user's own groups (see `supabase/migrations/0002_rls.sql`).
  A user in one family can never see another family's groups, expenses, or
  balances.
- Money columns are `NUMERIC`, never floating point.
- The Supabase anon key is safe to ship to the browser by design (it's
  paired with RLS); the service role key must never be used client-side.
- If you add AI features, the secret provider key must live server-side
  (an Edge Function), never in a `VITE_` variable.

## Known limitations / not yet implemented

- Invitations are recorded in the `invitations` table but no transactional
  email is sent — wire up a Supabase Edge Function + email provider (e.g.
  Resend) if you want automatic invite emails.
- No push/email notifications for new expenses or settlements.
- Avatar upload is a URL field today, not a file-upload widget.
