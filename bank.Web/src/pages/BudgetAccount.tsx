import { useEffect, useState, useMemo, useCallback } from 'react'
import { Target, TrendingDown, TrendingUp, CalendarDays, Link2, Link2Off, Search, X, ChevronDown, ChevronUp, AlertTriangle, Wallet } from 'lucide-react'
import {
  getDashboardSummary, getCategorySpending, getAccounts, getRecurring,
  getDataRange, getTransactions, getMatchedTotal, getMonthlyByText, updateRecurring, createRecurring,
  getRecurringCandidates,
  type BankAccount, type RecurringExpense, type CategorySpending,
  type DashboardSummary, type Transaction, type RecurringCandidate, type MonthlyAmount,
} from '../api/client'

const fmt = (n: number) =>
  new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n)

const FREQUENCY_LABELS: Record<number, string> = {
  1: 'Monthly', 2: 'Every 2 months', 3: 'Quarterly', 6: 'Biannual', 12: 'Annual',
}

type Period = 'this-year' | 'last-year' | '6m' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  'this-year': 'This year',
  'last-year': 'Last year',
  '6m': 'Last 6 months',
  'all': 'All time',
}

function getPeriodDates(period: Period, dataFirst?: string | null, dataLast?: string | null) {
  const today = new Date()
  const d = (dt: Date) => dt.toISOString().slice(0, 10)
  switch (period) {
    case 'this-year': return { from: d(new Date(today.getFullYear(), 0, 1)), to: d(today) }
    case 'last-year': {
      const y = today.getFullYear() - 1
      return { from: d(new Date(y, 0, 1)), to: d(new Date(y, 11, 31)) }
    }
    case '6m': {
      const f = new Date(today); f.setMonth(f.getMonth() - 6)
      return { from: d(f), to: d(today) }
    }
    case 'all':
      return { from: dataFirst ?? d(new Date(today.getFullYear(), 0, 1)), to: dataLast ?? d(today) }
  }
}

function periodMonths(from: string, to: string) {
  const f = new Date(from), t = new Date(to)
  return Math.max(1, (t.getFullYear() - f.getFullYear()) * 12 + t.getMonth() - f.getMonth() + 1)
}

const roundUpTo50 = (n: number) => Math.ceil(n / 50) * 50

function getMonthsInPeriod(from: string, to: string) {
  const result: { year: number; month: number; label: string }[] = []
  const f = new Date(from)
  const t = new Date(to)
  let cur = new Date(f.getFullYear(), f.getMonth(), 1)
  while (cur <= t) {
    result.push({
      year: cur.getFullYear(),
      month: cur.getMonth() + 1,
      label: cur.toLocaleDateString('en-DK', { month: 'short', year: '2-digit' }),
    })
    cur.setMonth(cur.getMonth() + 1)
  }
  return result
}

function pct(a: number, b: number) {
  if (b === 0) return null
  return Math.round(((a - b) / b) * 100)
}

function expectedForPeriod(exp: RecurringExpense, from: string, to: string): number {
  // Clamp the period to the expense's end date
  const effectiveTo = exp.endDate && exp.endDate < to ? exp.endDate : to
  if (effectiveTo < from) return 0
  const m = periodMonths(from, effectiveTo)
  return exp.amount * (m / exp.frequencyMonths)
}

export default function BudgetAccountPage() {
  const [period, setPeriod] = useState<Period>('this-year')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [accountId, setAccountId] = useState<number | null>(null)
  const [recurring, setRecurring] = useState<RecurringExpense[]>([])
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [dataFirst, setDataFirst] = useState<string | null>(null)
  const [dataLast, setDataLast] = useState<string | null>(null)
  // Account-specific data range — used to clamp the selected period
  const [accountFirst, setAccountFirst] = useState<string | null>(null)
  const [accountLast, setAccountLast] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Matched actuals: expenseId → summed transaction amount
  const [matchedActuals, setMatchedActuals] = useState<Record<number, number>>({})
  const [matchLoading, setMatchLoading] = useState(false)

  // Last year's summary — always used for projection regardless of selected period
  const prevYear = new Date().getFullYear() - 1
  const lyFrom = `${prevYear}-01-01`
  const lyTo = `${prevYear}-12-31`
  const [lastYearSummary, setLastYearSummary] = useState<DashboardSummary | null>(null)

  // Detected recurring candidates from account transactions
  const [candidates, setCandidates] = useState<RecurringCandidate[]>([])
  const [addingCandidate, setAddingCandidate] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dismissed-candidates-v2') ?? '[]')) }
    catch { return new Set() }
  })

  // Linker state
  const [linkingId, setLinkingId] = useState<number | null>(null)
  const [linkSearch, setLinkSearch] = useState('')
  const [linkTransactions, setLinkTransactions] = useState<Transaction[]>([])
  const [linkPattern, setLinkPattern] = useState('')
  const [linkSearchLoading, setLinkSearchLoading] = useState(false)
  const [savingLink, setSavingLink] = useState(false)

  // Year-over-year & missing payment
  const [lastYearMatchedActuals, setLastYearMatchedActuals] = useState<Record<number, number>>({})
  const [currentMonthActuals, setCurrentMonthActuals] = useState<Record<number, number>>({})

  // Monthly breakdown per expense (loaded on demand)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<Record<number, MonthlyAmount[]>>({})
  const [monthlyBreakdownLoading, setMonthlyBreakdownLoading] = useState(false)

  const todayDate = new Date()
  const dayOfMonth = todayDate.getDate()
  const cmFrom = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-01`
  const cmTo = todayDate.toISOString().slice(0, 10)

  const { from, to } = getPeriodDates(period, dataFirst, dataLast)

  // Clamp the selected period to what the account actually has data for
  const effectiveFrom = accountFirst && accountFirst > from ? accountFirst : from
  const effectiveTo = accountLast && accountLast < to ? accountLast : to

  const months = periodMonths(effectiveFrom, effectiveTo)

  const handleAccountChange = (id: number | null) => {
    setAccountId(id)
    if (id !== null) localStorage.setItem('budget-account-id', String(id))
    else localStorage.removeItem('budget-account-id')
  }

  // Initial load
  useEffect(() => {
    Promise.all([getAccounts(), getRecurring(), getDataRange()]).then(([accs, rec, range]) => {
      setAccounts(accs)
      setRecurring(rec)
      if (range.first) setDataFirst(range.first)
      if (range.last) setDataLast(range.last)
      const stored = localStorage.getItem('budget-account-id')
      if (stored) {
        const id = Number(stored)
        if (accs.some(a => a.id === id)) setAccountId(id)
      }
    })
  }, [])

  // Fetch account-specific data range whenever the account changes
  useEffect(() => {
    if (accountId === null) { setAccountFirst(null); setAccountLast(null); return }
    getDataRange(accountId).then(range => {
      setAccountFirst(range.first ?? null)
      setAccountLast(range.last ?? null)
    })
  }, [accountId])

  // Reload recurring when needed (after linking)
  const reloadRecurring = useCallback(() =>
    getRecurring().then(setRecurring), [])

  // Main data fetch
  useEffect(() => {
    if (accountId === null) {
      setCategorySpending([]); setSummary(null); setLastYearSummary(null); setCandidates([])
      return
    }
    setLoading(true)
    Promise.all([
      getCategorySpending(effectiveFrom, effectiveTo, accountId),
      getDashboardSummary(effectiveFrom, effectiveTo, accountId),
      getDashboardSummary(lyFrom, lyTo, accountId),
      getRecurringCandidates(accountFirst ?? lyFrom, accountLast ?? lyTo, accountId),
    ]).then(([cats, sum, lySum, cands]) => {
      setCategorySpending(cats)
      setSummary(sum)
      setLastYearSummary(lySum.transactionCount > 0 ? lySum : null)
      setCandidates(cands)
    }).finally(() => setLoading(false))
  }, [effectiveFrom, effectiveTo, accountId, lyFrom, lyTo, accountFirst, accountLast])

  // Fetch matched totals for any expense with a matchText
  useEffect(() => {
    if (accountId === null) { setMatchedActuals({}); return }
    const withMatch = recurring.filter(e => e.matchText)
    if (withMatch.length === 0) { setMatchedActuals({}); return }
    setMatchLoading(true)
    Promise.all(
      withMatch.map(e =>
        getMatchedTotal(e.matchText!, effectiveFrom, effectiveTo, accountId).then(total => ({ id: e.id, total }))
      )
    ).then(results => {
      const map: Record<number, number> = {}
      results.forEach(r => { map[r.id] = r.total })
      setMatchedActuals(map)
    }).finally(() => setMatchLoading(false))
  }, [recurring, effectiveFrom, effectiveTo, accountId])

  // Fetch last-year matched totals for YoY comparison
  useEffect(() => {
    if (accountId === null) { setLastYearMatchedActuals({}); return }
    const withMatch = recurring.filter(e => e.matchText)
    if (!withMatch.length) { setLastYearMatchedActuals({}); return }
    Promise.all(
      withMatch.map(e =>
        getMatchedTotal(e.matchText!, lyFrom, lyTo, accountId).then(t => ({ id: e.id, total: t }))
      )
    ).then(results => {
      const map: Record<number, number> = {}
      results.forEach(r => { map[r.id] = r.total })
      setLastYearMatchedActuals(map)
    })
  }, [recurring, accountId, lyFrom, lyTo])

  // Fetch current-month actuals for missing payment detection (monthly expenses only)
  useEffect(() => {
    if (accountId === null) { setCurrentMonthActuals({}); return }
    const monthly = recurring.filter(e => e.matchText && e.frequencyMonths === 1)
    if (!monthly.length) { setCurrentMonthActuals({}); return }
    Promise.all(
      monthly.map(e =>
        getMatchedTotal(e.matchText!, cmFrom, cmTo, accountId).then(t => ({ id: e.id, total: t }))
      )
    ).then(results => {
      const map: Record<number, number> = {}
      results.forEach(r => { map[r.id] = r.total })
      setCurrentMonthActuals(map)
    })
  }, [recurring, accountId, cmFrom, cmTo])

  // Search transactions for the linker
  useEffect(() => {
    if (linkingId === null || accountId === null) { setLinkTransactions([]); return }
    setLinkSearchLoading(true)
    const timer = setTimeout(() => {
      getTransactions({
        accountId,
        search: linkSearch || undefined,
        pageSize: 15,
        type: 'expense',
      }).then(d => setLinkTransactions(d.items))
        .finally(() => setLinkSearchLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [linkingId, linkSearch, accountId])

  const openLinker = (exp: RecurringExpense) => {
    setLinkingId(exp.id)
    setLinkSearch('')
    setLinkPattern(exp.matchText ?? '')
  }

  const closeLinker = () => {
    setLinkingId(null)
    setLinkSearch('')
    setLinkPattern('')
    setLinkTransactions([])
  }

  const saveLink = async (exp: RecurringExpense) => {
    setSavingLink(true)
    try {
      const pattern = linkPattern || null
      await updateRecurring(exp.id, {
        name: exp.name, amount: exp.amount, frequencyMonths: exp.frequencyMonths,
        category: exp.category, notes: exp.notes, endDate: exp.endDate,
        matchText: pattern,
      })
      // Show actual immediately — don't wait for the full recurring reload cycle
      if (pattern && accountId !== null) {
        const total = await getMatchedTotal(pattern, effectiveFrom, effectiveTo, accountId)
        setMatchedActuals(prev => ({ ...prev, [exp.id]: total }))
      } else {
        setMatchedActuals(prev => { const n = { ...prev }; delete n[exp.id]; return n })
      }
      closeLinker()
      reloadRecurring()  // fire-and-forget to keep recurring list in sync
    } finally {
      setSavingLink(false)
    }
  }

  const dismissCandidate = (text: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(text)
      localStorage.setItem('dismissed-candidates-v2', JSON.stringify([...next]))
      return next
    })
  }

  const addCandidate = async (c: RecurringCandidate) => {
    setAddingCandidate(c.text)
    try {
      await createRecurring({
        name: c.text,
        amount: Math.round(c.averageAmount),
        frequencyMonths: c.suggestedFrequencyMonths,
        matchText: c.text,
      })
      await reloadRecurring()
    } finally {
      setAddingCandidate(null)
    }
  }

  const unlink = async (exp: RecurringExpense) => {
    await updateRecurring(exp.id, {
      name: exp.name, amount: exp.amount, frequencyMonths: exp.frequencyMonths,
      category: exp.category, notes: exp.notes, endDate: exp.endDate,
      matchText: null,
    })
    await reloadRecurring()
  }

  const toggleExpand = async (exp: RecurringExpense) => {
    if (expandedRow === exp.id) { setExpandedRow(null); return }
    setExpandedRow(exp.id)
    if (!exp.matchText || monthlyBreakdown[exp.id]) return
    setMonthlyBreakdownLoading(true)
    getMonthlyByText(exp.matchText, effectiveFrom, effectiveTo, accountId)
      .then(data => setMonthlyBreakdown(prev => ({ ...prev, [exp.id]: data })))
      .finally(() => setMonthlyBreakdownLoading(false))
  }

  const isMissingPayment = (exp: RecurringExpense) =>
    exp.frequencyMonths === 1 &&
    !!exp.matchText &&
    dayOfMonth >= 10 &&
    (currentMonthActuals[exp.id] ?? 0) === 0

  // Build plan rows using matchText actuals first, then category fallback
  const planRows = useMemo(() => recurring.map(exp => {
    let actual = 0
    if (exp.matchText) {
      actual = matchedActuals[exp.id] ?? 0

    } else if (exp.category) {
      const cat = categorySpending.find(c => c.category.toLowerCase() === exp.category!.toLowerCase())
      actual = cat?.amount ?? 0
    }
    const expected = roundUpTo50(expectedForPeriod(exp, effectiveFrom, effectiveTo))
    return { exp, expected, actual, diff: actual - expected }
  }), [recurring, matchedActuals, categorySpending, effectiveFrom, effectiveTo])

  const matchedCats = new Set(
    planRows.filter(r => r.exp.category && !r.exp.matchText && r.actual > 0)
      .map(r => r.exp.category!.toLowerCase())
  )
  const unplanned = categorySpending.filter(c => !matchedCats.has(c.category.toLowerCase()))
  const totalUnplanned = unplanned.reduce((s, c) => s + c.amount, 0)

  const totalPlanned = roundUpTo50(recurring.reduce((s, e) => s + expectedForPeriod(e, effectiveFrom, effectiveTo), 0))
  const totalActual = summary?.totalExpenses ?? 0
  const totalIncome = summary?.totalIncome ?? 0
  const variance = totalActual - totalPlanned

  const plannedAnnual = roundUpTo50(recurring.reduce((s, e) => s + e.annualEquivalent, 0))
  // Projection always based on last year's actuals — independent of the selected view period
  const lastYearActual = lastYearSummary?.totalExpenses ?? 0
  const hasLastYearData = lastYearActual > 0
  // Fall back to annualising current period if no last-year data exists yet
  const annualFactor = 12 / months
  const projectedAnnual = hasLastYearData ? lastYearActual : totalActual * annualFactor
  const recommendedMonthly = roundUpTo50(Math.max(projectedAnnual, plannedAnnual) / 12)

  // Sum the actual amounts from each plan row (not totalActual, which includes unplanned spend)
  const totalPlanActual = planRows.reduce((s, r) => s + r.actual, 0)

  // Running balance projection
  const currentBalance = summary?.currentBalance ?? 0
  const remainingMonthsThisYear = Math.max(0, 12 - todayDate.getMonth()) // months left including current
  const monthlySpendRate = months > 0 ? totalActual / months : 0
  const monthlyIncomeRate = months > 0 ? totalIncome / months : 0
  const projectedEndBalance = currentBalance + (monthlyIncomeRate - monthlySpendRate) * remainingMonthsThisYear

  const periods: Period[] = ['this-year', 'last-year', '6m', 'all']

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Budget Account</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Compare your recurring expense plan against actual spending
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={accountId ?? ''}
            onChange={e => handleAccountChange(e.target.value === '' ? null : Number(e.target.value))}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select budget account…</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
          </select>
          <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {periods.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-2 text-sm font-medium transition ${period === p
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* No account */}
      {accountId === null && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-12 text-center">
          <Target className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-medium text-slate-600 dark:text-slate-300">Select your budget account above</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            Upload statements on the{' '}
            <a href="/upload" className="text-primary-600 dark:text-primary-400 hover:underline">Upload page</a>,
            then pick the account here to see plan vs reality.
          </p>
        </div>
      )}

      {accountId !== null && (
        <>
          {/* Effective period notice — shown when account data doesn't cover the full selected period */}
          {(effectiveFrom !== from || effectiveTo !== to) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
              Account data available from <strong>{effectiveFrom}</strong> to <strong>{effectiveTo}</strong> — planned figures adjusted to match.
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Planned spending</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{fmt(totalPlanned)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">From your recurring expenses</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Actual spending</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {loading ? '…' : fmt(totalActual)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Outflows from account</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Transferred in</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {loading ? '…' : fmt(totalIncome)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Deposits &amp; transfers received</p>
            </div>
            <div className={`rounded-2xl border shadow-sm p-5 ${variance <= 0
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
              <p className={`text-sm font-medium ${variance <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {variance <= 0 ? 'Under budget' : 'Over budget'}
              </p>
              <p className={`text-2xl font-bold mt-1 ${variance <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {loading ? '…' : fmt(Math.abs(variance))}
              </p>
              <p className={`text-xs mt-1 ${variance <= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500'}`}>
                {variance <= 0 ? 'Spending less than planned' : 'Spending more than planned'}
              </p>
            </div>
          </div>

          {/* Missing payment alerts */}
          {(() => {
            const missing = planRows.filter(r => isMissingPayment(r.exp))
            if (!missing.length) return null
            return (
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Payments not seen this month yet</p>
                  <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400">
                    {missing.map(r => r.exp.name).join(', ')}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Plan vs Reality */}
          {recurring.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-semibold text-slate-700 dark:text-slate-200">Plan vs Reality</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Click <span className="inline-flex items-center gap-0.5"><Link2 className="w-3 h-3" /> Link</span> on
                  any row to match it to transactions in your account. The pattern is saved and applied automatically next time.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
                      <th className="px-5 py-3 font-medium">Expense</th>
                      <th className="px-5 py-3 font-medium hidden sm:table-cell">Frequency</th>
                      <th className="px-5 py-3 font-medium text-right">Planned</th>
                      <th className="px-5 py-3 font-medium text-right">Actual</th>
                      <th className="px-5 py-3 font-medium text-right">Difference</th>
                      <th className="px-5 py-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {planRows.map(({ exp, expected, actual, diff }) => {
                      const lyActual = lastYearMatchedActuals[exp.id]
                      const yoyPct = exp.matchText && actual > 0 && lyActual != null ? pct(actual, lyActual) : null
                      const missing = isMissingPayment(exp)
                      const isExpanded = expandedRow === exp.id
                      const breakdown = monthlyBreakdown[exp.id]
                      const periodMonthList = getMonthsInPeriod(effectiveFrom, effectiveTo)
                      return (
                      <>
                        <tr key={exp.id} className={`transition-colors ${linkingId === exp.id ? 'bg-primary-50 dark:bg-primary-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {missing && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              )}
                              <p className="font-medium text-slate-700 dark:text-slate-200">{exp.name}</p>
                            </div>
                            {exp.matchText ? (
                              <p className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1 mt-0.5">
                                <Link2 className="w-3 h-3 flex-shrink-0" />
                                <span className="font-mono truncate max-w-[200px]">{exp.matchText}</span>
                              </p>
                            ) : exp.category ? (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{exp.category} (category match)</p>
                            ) : (
                              <p className="text-xs text-slate-300 dark:text-slate-600 italic mt-0.5">No match — click Link</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                            {FREQUENCY_LABELS[exp.frequencyMonths] ?? `Every ${exp.frequencyMonths}m`}
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium text-slate-600 dark:text-slate-300">
                            {fmt(expected)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {(matchLoading && exp.matchText) ? (
                              <span className="text-slate-300 dark:text-slate-600">…</span>
                            ) : actual > 0 ? (
                              <div>
                                <span className="font-medium text-slate-700 dark:text-slate-200">{fmt(actual)}</span>
                                {yoyPct !== null && (
                                  <p className={`text-xs mt-0.5 ${yoyPct > 5 ? 'text-red-500' : yoyPct < -5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {yoyPct > 0 ? '+' : ''}{yoyPct}% vs {prevYear}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold">
                            {actual === 0 ? (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            ) : (
                              <span className={diff <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                                {diff > 0 ? '+' : ''}{fmt(diff)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center gap-0.5 justify-end">
                              {exp.matchText && (
                                <button onClick={() => toggleExpand(exp)}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title={isExpanded ? 'Hide monthly breakdown' : 'Show monthly breakdown'}>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                              {linkingId === exp.id ? (
                                <button onClick={closeLinker}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="Cancel">
                                  <X className="w-4 h-4" />
                                </button>
                              ) : exp.matchText ? (
                                <>
                                  <button onClick={() => openLinker(exp)}
                                    className="p-1.5 text-primary-500 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
                                    title="Change match">
                                    <Link2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => unlink(exp)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                    title="Remove match">
                                    <Link2Off className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => openLinker(exp)}
                                  className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
                                  title="Link to transactions">
                                  <Link2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Monthly breakdown panel */}
                        {isExpanded && (
                          <tr key={`${exp.id}-breakdown`}>
                            <td colSpan={6} className="px-5 pb-4 pt-0 bg-slate-50 dark:bg-slate-800/40">
                              <div className="overflow-x-auto pt-3">
                                {monthlyBreakdownLoading && !breakdown ? (
                                  <p className="text-xs text-slate-400 py-2">Loading…</p>
                                ) : (
                                  <div className="flex gap-2 min-w-max">
                                    {periodMonthList.map(m => {
                                      const row = breakdown?.find(b => b.year === m.year && b.month === m.month)
                                      const amt = row?.amount ?? 0
                                      return (
                                        <div key={`${m.year}-${m.month}`}
                                          className={`flex flex-col items-center rounded-xl px-3 py-2 min-w-[64px] text-center text-xs border ${
                                            amt > 0
                                              ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                              : 'bg-slate-100 dark:bg-slate-800 border-transparent'
                                          }`}>
                                          <span className="text-slate-400 dark:text-slate-500 mb-1">{m.label}</span>
                                          {amt > 0 ? (
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">{fmt(amt)}</span>
                                          ) : (
                                            <span className="text-slate-300 dark:text-slate-600">—</span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Inline linker panel */}
                        {linkingId === exp.id && (
                          <tr key={`${exp.id}-linker`}>
                            <td colSpan={6} className="px-5 pb-5 pt-0 bg-primary-50 dark:bg-primary-900/10">
                              <div className="border border-primary-200 dark:border-primary-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                {/* Pattern input */}
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex gap-3 items-center">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                      Match pattern — transactions whose description contains this text
                                    </p>
                                    <input
                                      type="text"
                                      value={linkPattern}
                                      onChange={e => setLinkPattern(e.target.value)}
                                      placeholder="Type or pick from transactions below…"
                                      className="w-full font-mono text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                  </div>
                                  <button
                                    onClick={() => saveLink(exp)}
                                    disabled={savingLink || !linkPattern}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition flex-shrink-0"
                                  >
                                    {savingLink ? 'Saving…' : 'Save'}
                                  </button>
                                </div>

                                {/* Transaction search */}
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                      type="text"
                                      value={linkSearch}
                                      onChange={e => setLinkSearch(e.target.value)}
                                      placeholder="Search transactions to pick a pattern…"
                                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                  </div>
                                </div>

                                {/* Transaction list */}
                                <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                                  {linkSearchLoading ? (
                                    <div className="px-4 py-4 text-sm text-slate-400 text-center">Loading…</div>
                                  ) : linkTransactions.length === 0 ? (
                                    <div className="px-4 py-4 text-sm text-slate-400 text-center">No transactions found</div>
                                  ) : linkTransactions.map(tx => (
                                    <button
                                      key={tx.id}
                                      onClick={() => setLinkPattern(tx.text)}
                                      className="w-full text-left px-4 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition flex items-center justify-between gap-4 group"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-primary-700 dark:group-hover:text-primary-300">
                                          {tx.text}
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">{tx.date} · {tx.category}</p>
                                      </div>
                                      <span className="text-sm font-semibold text-red-500 dark:text-red-400 flex-shrink-0">
                                        {fmt(tx.amount)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-700 dark:text-slate-200 border-t-2 border-slate-200 dark:border-slate-700">
                      <td className="px-5 py-3.5" colSpan={2}>Total</td>
                      <td className="px-5 py-3.5 text-right">{fmt(totalPlanned)}</td>
                      <td className="px-5 py-3.5 text-right">{matchLoading ? '…' : fmt(totalPlanActual)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {!matchLoading && (() => {
                          const d = totalPlanActual - totalPlanned
                          return <span className={d <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                            {d > 0 ? '+' : ''}{fmt(d)}
                          </span>
                        })()}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Unplanned spending */}
          {!loading && unplanned.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-700 dark:text-slate-200">Unplanned Spending</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Categories not matched to any recurring expense</p>
                </div>
                <span className="text-sm font-bold text-red-500 dark:text-red-400">{fmt(totalUnplanned)}</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {unplanned.sort((a, b) => b.amount - a.amount).map(c => (
                    <tr key={c.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-lg px-2.5 py-1">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-slate-400 dark:text-slate-500">
                        {c.percentage.toFixed(1)}% of all spending
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-200">
                        {fmt(c.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {recurring.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-5 text-sm text-amber-800 dark:text-amber-300">
              No recurring expenses yet.{' '}
              <a href="/recurring" className="font-semibold underline hover:no-underline">Add them on the Recurring Expenses page</a>{' '}
              to see your plan vs reality.
            </div>
          )}

          {/* Next year projection */}
          {!loading && (totalActual > 0 || hasLastYearData) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5">
                <CalendarDays className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h2 className="font-semibold text-slate-700 dark:text-slate-200">Next Year Budget Projection</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Based on actual spending</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {fmt(projectedAnnual)}<span className="text-sm font-normal text-slate-400 dark:text-slate-500">/yr</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {hasLastYearData ? `${prevYear} full year` : `Annualized from ${PERIOD_LABELS[period].toLowerCase()}`}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current recurring plan</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {fmt(plannedAnnual)}<span className="text-sm font-normal text-slate-400 dark:text-slate-500">/yr</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">From your recurring expenses</p>
                </div>
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-primary-700 dark:text-primary-400 mb-1">Recommended monthly transfer</p>
                  <p className="text-xl font-bold text-primary-700 dark:text-primary-300">
                    {fmt(recommendedMonthly)}<span className="text-sm font-normal">/mo</span>
                  </p>
                  <p className="text-xs text-primary-600 dark:text-primary-500 mt-1">Higher of actual vs plan ÷ 12</p>
                </div>
                <div className={`rounded-xl p-4 border ${projectedEndBalance >= 0
                  ? 'bg-slate-50 dark:bg-slate-800/60 border-transparent'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wallet className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Projected end-of-year balance</p>
                  </div>
                  <p className={`text-xl font-bold mt-0 ${projectedEndBalance >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
                    {fmt(projectedEndBalance)}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Current {fmt(currentBalance)} · {remainingMonthsThisYear}mo remaining
                  </p>
                </div>
              </div>
              {projectedAnnual > plannedAnnual ? (
                <div className="flex items-start gap-2.5 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl px-4 py-3">
                  <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Actual spending runs <strong>{fmt(projectedAnnual - plannedAnnual)}</strong> per year above your plan.
                    Consider updating your recurring expenses to reflect reality.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl px-4 py-3">
                  <TrendingDown className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Spending <strong>{fmt(plannedAnnual - projectedAnnual)}</strong> per year below plan — your budget has a healthy buffer.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Detected recurring patterns */}
          {(() => {
            const linkedTexts = new Set(recurring.map(e => e.matchText).filter(Boolean) as string[])
            const visible = candidates.filter(c => !linkedTexts.has(c.text) && !dismissed.has(c.text))
            if (visible.length === 0) return null
            return (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="font-semibold text-slate-700 dark:text-slate-200">Detected Recurring Patterns</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Transactions that appear in multiple months but aren't in your plan yet.
                    Added entries use the transaction text as the match — rename them freely on the Recurring Expenses page.
                  </p>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {visible.map(c => (
                    <div key={c.text} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{c.text}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          Detected as <strong>{FREQUENCY_LABELS[c.suggestedFrequencyMonths]}</strong>
                          {' · '}seen in <strong>{c.monthCount}</strong> months
                          {' · '}avg <strong>{fmt(c.averageAmount)}</strong> per occurrence
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => addCandidate(c)}
                          disabled={addingCandidate === c.text}
                          className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 transition"
                        >
                          {addingCandidate === c.text ? 'Adding…' : 'Add to plan'}
                        </button>
                        <button
                          onClick={() => dismissCandidate(c.text)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
