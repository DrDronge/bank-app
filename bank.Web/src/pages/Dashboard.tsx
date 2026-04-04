import { useEffect, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Wallet, Hash, GitCompare } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import StatCard from '../components/StatCard'
import {
  getDashboardSummary, getCategorySpending, getMonthlyTrends, getTransactions,
  getBalanceHistory, getDataRange, getAccounts,
  type DashboardSummary, type CategorySpending, type MonthlyTrend,
  type Transaction, type DailyBalance, type BankAccount
} from '../api/client'

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316']

const fmt = (n: number) =>
  new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n)

type Period = 'this-month' | 'last-month' | '3m' | '6m' | 'ytd' | '1y' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  'this-month': 'This month',
  'last-month': 'Last month',
  '3m': '3M',
  '6m': '6M',
  'ytd': 'YTD',
  '1y': '1Y',
  'all': 'All time',
}

function getPeriodDates(period: Period, dataFirst?: string | null): { from: string; to: string } {
  const today = new Date()
  const toStr = () => today.toISOString().slice(0, 10)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  switch (period) {
    case 'this-month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: fmt(from), to: toStr() }
    }
    case 'last-month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const to = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: fmt(from), to: fmt(to) }
    }
    case '3m': {
      const from = new Date(today)
      from.setMonth(from.getMonth() - 3)
      return { from: fmt(from), to: toStr() }
    }
    case '6m': {
      const from = new Date(today)
      from.setMonth(from.getMonth() - 6)
      return { from: fmt(from), to: toStr() }
    }
    case 'ytd': {
      const from = new Date(today.getFullYear(), 0, 1)
      return { from: fmt(from), to: toStr() }
    }
    case '1y': {
      const from = new Date(today)
      from.setFullYear(from.getFullYear() - 1)
      return { from: fmt(from), to: toStr() }
    }
    case 'all': {
      return { from: dataFirst ?? '2000-01-01', to: toStr() }
    }
  }
}

function pctChange(current: number, prev: number) {
  if (prev === 0) return null
  const p = ((current - prev) / Math.abs(prev)) * 100
  return { value: `${Math.abs(p).toFixed(1)}%`, positive: p >= 0 }
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('this-month')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [dataFirst, setDataFirst] = useState<string | null>(null)

  const [compareEnabled, setCompareEnabled] = useState(false)
  const [comparePeriod, setComparePeriod] = useState<Period>('last-month')

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [compareSummary, setCompareSummary] = useState<DashboardSummary | null>(null)
  const [categories, setCategories] = useState<CategorySpending[]>([])
  const [trends, setTrends] = useState<MonthlyTrend[]>([])
  const [balanceHistory, setBalanceHistory] = useState<DailyBalance[]>([])
  const [recent, setRecent] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Load accounts and data range once
  useEffect(() => {
    Promise.all([getAccounts(), getDataRange()]).then(([accs, range]) => {
      setAccounts(accs)
      if (range.first) setDataFirst(range.first)
    })
  }, [])

  const { from, to } = getPeriodDates(period, dataFirst)
  const { from: trendsFrom, to: trendsTo } = getPeriodDates('1y', dataFirst)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getDashboardSummary(from, to, accountId),
      getCategorySpending(from, to, accountId),
      getMonthlyTrends(trendsFrom, trendsTo, accountId),
      getBalanceHistory(trendsFrom, trendsTo, accountId),
      getTransactions({ page: 1, pageSize: 6, accountId }),
    ]).then(([sum, cats, trend, bal, tx]) => {
      setSummary(sum)
      setCategories(cats)
      setTrends(trend)
      setBalanceHistory(bal)
      setRecent(tx.items)
    }).finally(() => setLoading(false))
  }, [period, accountId, from, to, trendsFrom, trendsTo])

  useEffect(() => {
    if (!compareEnabled) { setCompareSummary(null); return }
    const { from: cf, to: ct } = getPeriodDates(comparePeriod, dataFirst)
    getDashboardSummary(cf, ct, accountId).then(setCompareSummary)
  }, [compareEnabled, comparePeriod, accountId, dataFirst])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">Loading your data…</div>
  )
  if (!summary) return null

  const noData = summary.transactionCount === 0

  const periods: Period[] = ['this-month', 'last-month', '3m', '6m', 'ytd', '1y', 'all']

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Your financial overview</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Period buttons */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {periods.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  period === p
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Account filter */}
          {accounts.length > 0 && (
            <select
              value={accountId ?? ''}
              onChange={e => setAccountId(e.target.value === '' ? null : Number(e.target.value))}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All accounts</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}

          {/* Compare toggle */}
          <button
            onClick={() => setCompareEnabled(v => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition ${
              compareEnabled
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary-300'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            Compare
          </button>

          {/* Compare period selector */}
          {compareEnabled && (
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {periods.map(p => (
                <button
                  key={p}
                  onClick={() => setComparePeriod(p)}
                  className={`px-3 py-1.5 text-sm font-medium transition ${
                    comparePeriod === p
                      ? 'bg-slate-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {noData && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 text-amber-800 dark:text-amber-300 text-sm">
          <p className="font-semibold mb-1">No transactions found for this period.</p>
          <p>
            <a href="/upload" className="font-semibold underline">Upload a bank statement</a>
            {' '}to get started, or pick a different period above.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Income"
          value={fmt(summary.totalIncome)}
          icon={<ArrowUpCircle className="w-5 h-5" />}
          color="green"
          sub={compareEnabled && compareSummary ? pctChange(summary.totalIncome, compareSummary.totalIncome)?.value : undefined}
          subPositive={compareEnabled && compareSummary ? pctChange(summary.totalIncome, compareSummary.totalIncome)?.positive : undefined}
        />
        <StatCard
          label="Expenses"
          value={fmt(summary.totalExpenses)}
          icon={<ArrowDownCircle className="w-5 h-5" />}
          color="red"
          sub={compareEnabled && compareSummary ? pctChange(summary.totalExpenses, compareSummary.totalExpenses)?.value : undefined}
          subPositive={compareEnabled && compareSummary ? !(pctChange(summary.totalExpenses, compareSummary.totalExpenses)?.positive) : undefined}
        />
        <StatCard
          label="Net"
          value={fmt(summary.netAmount)}
          icon={<Wallet className="w-5 h-5" />}
          color={summary.netAmount >= 0 ? 'green' : 'red'}
          sub={compareEnabled && compareSummary ? pctChange(summary.netAmount, compareSummary.netAmount)?.value : undefined}
          subPositive={compareEnabled && compareSummary ? pctChange(summary.netAmount, compareSummary.netAmount)?.positive : undefined}
        />
        <StatCard
          label="Transactions"
          value={summary.transactionCount.toString()}
          icon={<Hash className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* Compare summary banner */}
      {compareEnabled && compareSummary && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {PERIOD_LABELS[comparePeriod]} ({compareSummary.from} → {compareSummary.to}):
          </span>{' '}
          Income {fmt(compareSummary.totalIncome)} · Expenses {fmt(compareSummary.totalExpenses)} · Net {fmt(compareSummary.netAmount)}
        </div>
      )}

      {/* Charts row — monthly trend + category */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Monthly Overview (12 months)</h2>
          {trends.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trends} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{ background: 'var(--tw-tooltip-bg, #fff)', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Spending by Category</h2>
          {categories.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No expense data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categories.slice(0, 8)} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                  {categories.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend
                  formatter={(v: string) => (
                    <span style={{ fontSize: 10, color: '#64748b' }}>
                      {v.length > 16 ? v.slice(0, 16) + '…' : v}
                    </span>
                  )}
                />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Balance over time */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Balance Over Time (12 months)</h2>
        {balanceHistory.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">No balance data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={balanceHistory}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={d => {
                  const [, m, day] = d.split('-')
                  return `${day}/${m}`
                }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                labelFormatter={l => `Date: ${l}`}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="balance" name="Balance" stroke="#6366f1" strokeWidth={2} fill="url(#balGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200">Recent Transactions</h2>
          <a href="/transactions" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">View all →</a>
        </div>
        {recent.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">No transactions yet</p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {recent.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{tx.text}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{tx.category} · {tx.date}</p>
                </div>
                <span className={`text-sm font-semibold ml-4 ${tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
