import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, Download, ChevronUp, ChevronDown } from 'lucide-react'
import { getTransactions, getCategories, getAccounts, exportCsv, type Transaction, type BankAccount } from '../api/client'

const fmt = (n: number) =>
  new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(n)

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [type, setType] = useState('')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState('date')
  const [sortDesc, setSortDesc] = useState(true)
  const [loading, setLoading] = useState(false)

  const pageSize = 20

  useEffect(() => {
    Promise.all([getCategories(), getAccounts()]).then(([cats, accs]) => {
      setCategories(cats)
      setAccounts(accs)
    })
  }, [])

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDesc(d => !d)
    } else {
      setSortBy(col)
      setSortDesc(true)
    }
    setPage(1)
  }

  const load = useCallback(() => {
    setLoading(true)
    getTransactions({
      page,
      pageSize,
      search: search || undefined,
      category: category || undefined,
      type: type || undefined,
      accountId,
      sortBy,
      sortDesc,
    })
      .then(data => {
        setTransactions(data.items)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      })
      .finally(() => setLoading(false))
  }, [page, search, category, type, accountId, sortBy, sortDesc])

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  const handleSearch = (v: string) => { setSearch(v); setPage(1) }

  const handleExport = () => exportCsv({
    search: search || undefined,
    category: category || undefined,
    type: type || undefined,
    accountId,
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Transactions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{total} transactions total</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1) }}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={type}
          onChange={e => { setType(e.target.value); setPage(1) }}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All types</option>
          <option value="income">Income only</option>
          <option value="expense">Expenses only</option>
        </select>
        {accounts.length > 0 && (
          <select
            value={accountId ?? ''}
            onChange={e => { setAccountId(e.target.value === '' ? null : Number(e.target.value)); setPage(1) }}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All accounts</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            No transactions found.{' '}
            <a href="/upload" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              Upload a statement
            </a>{' '}
            to get started.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
                    {[
                      { col: 'date', label: 'Date', cls: '' },
                      { col: 'description', label: 'Description', cls: '' },
                      { col: 'category', label: 'Category', cls: 'hidden md:table-cell' },
                      { col: 'amount', label: 'Amount', cls: 'text-right' },
                      { col: 'balance', label: 'Balance', cls: 'text-right hidden lg:table-cell' },
                    ].map(({ col, label, cls }) => (
                      <th
                        key={col}
                        className={`px-5 py-3 font-medium select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${cls}`}
                        onClick={() => handleSort(col)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {sortBy === col
                            ? sortDesc
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronUp className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5 opacity-20" />
                          }
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{tx.date}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-700 dark:text-slate-200">{tx.text}</p>
                        <p className="text-xs text-slate-400 md:hidden">{tx.category}</p>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-lg px-2.5 py-1 max-w-[160px] truncate">
                          {tx.category}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 text-right font-semibold ${tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                        {fmt(tx.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
