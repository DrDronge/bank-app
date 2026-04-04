import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Receipt, X, Check, ArrowRight, Link2 } from 'lucide-react'
import {
  getRecurring, createRecurring, updateRecurring, deleteRecurring,
  type RecurringExpense
} from '../api/client'

const fmt = (n: number) =>
  new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n)

const FREQUENCY_LABELS: Record<number, string> = {
  1: 'Monthly',
  2: 'Every 2 months',
  3: 'Quarterly',
  6: 'Biannual',
  12: 'Annual',
}

const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Monthly' },
  { value: 2, label: 'Every 2 months' },
  { value: 3, label: 'Quarterly' },
  { value: 6, label: 'Biannual' },
  { value: 12, label: 'Annual' },
]

const FREQUENCY_ORDER = [1, 2, 3, 6, 12]

interface FormState {
  name: string
  amount: string
  frequencyMonths: number
  category: string
  notes: string
  endMonth: string  // "YYYY-MM" from <input type="month">
}

const emptyForm = (): FormState => ({
  name: '',
  amount: '',
  frequencyMonths: 1,
  category: '',
  notes: '',
  endMonth: '',
})

// "YYYY-MM-DD" → "YYYY-MM" for the month input
const toMonthValue = (date: string | null) => date ? date.slice(0, 7) : ''

// "YYYY-MM" → "YYYY-MM-01" for the API (first of the month, stored as DateOnly)
const toApiDate = (month: string) => month ? `${month}-01` : null

function formatMonth(date: string | null) {
  if (!date) return null
  const [year, month] = date.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

const todayStr = () => new Date().toISOString().slice(0, 7)  // "YYYY-MM"

function endDateStatus(endDate: string | null, remainingMonths: number | null): 'expired' | 'soon' | 'future' | null {
  if (!endDate) return null
  if (remainingMonths !== null && remainingMonths <= 0) return 'expired'
  if (remainingMonths !== null && remainingMonths <= 3) return 'soon'
  return 'future'
}

export default function RecurringPage() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    getRecurring().then(setExpenses).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.amount) return
    setSaving(true)
    try {
      const base = {
        name: form.name,
        amount: parseFloat(form.amount),
        frequencyMonths: form.frequencyMonths,
        category: form.category || null,
        notes: form.notes || null,
        endDate: toApiDate(form.endMonth),
      }
      if (editId !== null) {
        // Preserve existing matchText — it's managed from the Budget Account page
        const existing = expenses.find(e => e.id === editId)
        await updateRecurring(editId, { ...base, matchText: existing?.matchText ?? null })
      } else {
        await createRecurring({ ...base, matchText: null })
      }
      setShowForm(false)
      setEditId(null)
      setForm(emptyForm())
      load()
    } finally {
      setSaving(false) }
  }

  const handleEdit = (expense: RecurringExpense) => {
    setEditId(expense.id)
    setForm({
      name: expense.name,
      amount: String(expense.amount),
      frequencyMonths: expense.frequencyMonths,
      category: expense.category ?? '',
      notes: expense.notes ?? '',
      endMonth: toMonthValue(expense.endDate),
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number) => {
    await deleteRecurring(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm())
  }

  // Active = no end date, or end date is this month or later
  const activeExpenses = expenses.filter(e => e.remainingMonths === null || e.remainingMonths > 0)

  const totalMonthly = activeExpenses.reduce((s, e) => s + e.monthlyEquivalent, 0)
  const totalAnnual = activeExpenses.reduce((s, e) => s + e.annualEquivalent, 0)

  // Transfer breakdown: monthly items are due in full; non-monthly items need a monthly set-aside
  const monthlyDue = activeExpenses.filter(e => e.frequencyMonths === 1).reduce((s, e) => s + e.amount, 0)
  const setAside = activeExpenses.filter(e => e.frequencyMonths > 1).reduce((s, e) => s + e.monthlyEquivalent, 0)

  const grouped = FREQUENCY_ORDER
    .map(freq => ({
      freq,
      label: FREQUENCY_LABELS[freq],
      items: expenses.filter(e => e.frequencyMonths === freq),
    }))
    .filter(g => g.items.length > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Recurring Expenses</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Track your fixed recurring costs</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm()) }}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition"
          >
            <Plus className="w-4 h-4" /> Add expense
          </button>
        )}
      </div>

      {/* Summary */}
      {expenses.length > 0 && (
        <div className="space-y-3">
          {/* Transfer banner */}
          <div className="bg-primary-600 dark:bg-primary-700 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRight className="w-4 h-4 opacity-80" />
              <p className="text-sm font-medium opacity-90">Transfer to budget account each month</p>
            </div>
            <p className="text-4xl font-bold tracking-tight">{fmt(totalMonthly)}</p>
            <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap gap-x-6 gap-y-1 text-sm opacity-80">
              {monthlyDue > 0 && (
                <span>Monthly bills: <strong className="opacity-100">{fmt(monthlyDue)}</strong></span>
              )}
              {setAside > 0 && (
                <span>Set aside for future: <strong className="opacity-100">{fmt(setAside)}</strong></span>
              )}
              <span className="ml-auto">Annual total: <strong className="opacity-100">{fmt(totalAnnual)}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            {editId !== null ? 'Edit expense' : 'New recurring expense'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Gym, Rent"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount (DKK) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Frequency *</label>
                <select
                  value={form.frequencyMonths}
                  onChange={e => setForm(f => ({ ...f, frequencyMonths: Number(e.target.value) }))}
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {FREQUENCY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Subscriptions, Housing"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="Any notes…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Final payment (optional)</label>
                {(() => {
                  const selectClass = "flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  const [selYear, selMonth] = form.endMonth ? form.endMonth.split('-') : ['', '']
                  const currentYear = new Date().getFullYear()
                  const years = Array.from({ length: 10 }, (_, i) => currentYear + i)
                  const months = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December',
                  ]
                  const update = (year: string, month: string) => {
                    const val = year && month ? `${year}-${month}` : ''
                    setForm(f => ({ ...f, endMonth: val }))
                  }
                  return (
                    <div className="flex gap-2">
                      <select
                        value={selMonth}
                        onChange={e => update(selYear, e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Month…</option>
                        {months.map((m, i) => (
                          <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={selYear}
                        onChange={e => update(e.target.value, selMonth)}
                        className={selectClass}
                      >
                        <option value="">Year…</option>
                        {years.map(y => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )
                })()}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Leave blank if ongoing</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving…' : editId !== null ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense list */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">Loading…</div>
      ) : expenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-10 text-center">
          <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No recurring expenses yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Click "Add expense" to start tracking your fixed costs.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ freq, label, items }) => {
            const subtotalMonthly = items.reduce((s, e) => s + e.monthlyEquivalent, 0)
            return (
              <div key={freq}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {label}
                  </h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {fmt(subtotalMonthly)}/mo
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map(expense => (
                    <div
                      key={expense.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{expense.name}</p>
                            {expense.category && (
                              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg">
                                {expense.category}
                              </span>
                            )}
                          </div>
                          {expense.notes && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{expense.notes}</p>
                          )}
                          {expense.matchText && (
                            <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5 flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              Matched: <span className="font-mono truncate max-w-[200px]">{expense.matchText}</span>
                            </p>
                          )}
                          <div className="flex flex-wrap gap-4 mt-2 text-sm">
                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                              {fmt(expense.amount)} / {FREQUENCY_LABELS[expense.frequencyMonths].toLowerCase()}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500">
                              {fmt(expense.monthlyEquivalent)}/mo
                            </span>
                            <span className="text-slate-400 dark:text-slate-500">
                              {fmt(expense.annualEquivalent)}/yr
                            </span>
                          </div>
                          {expense.endDate && (() => {
                            const status = endDateStatus(expense.endDate, expense.remainingMonths)
                            return (
                              <div className="mt-2">
                                {status === 'expired' && (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                                    Ended {formatMonth(expense.endDate)}
                                  </span>
                                )}
                                {status === 'soon' && (
                                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                    Final payment: {formatMonth(expense.endDate)} · {expense.remainingMonths} month{expense.remainingMonths !== 1 ? 's' : ''} left
                                  </span>
                                )}
                                {status === 'future' && (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">
                                    Final payment: {formatMonth(expense.endDate)} · {expense.remainingMonths} months left
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
