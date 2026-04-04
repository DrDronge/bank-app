import { useState, useRef, useEffect } from 'react'
import { Upload, CheckCircle, AlertCircle, FileText, X, Trash2 } from 'lucide-react'
import { uploadCsv, deleteAllTransactions, getAccounts, createAccount, type BankAccount } from '../api/client'

type Status = 'idle' | 'uploading' | 'success' | 'error'

const SUPPORTED_BANKS = ['Danske Bank', 'Nordea', 'Lunar', 'Other banks (auto-detect)']

const PRESET_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#10b981', label: 'Green' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#06b6d4', label: 'Cyan' },
]

const ACCOUNT_TYPES = ['Checking', 'Savings', 'Credit']

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{ message: string; imported: number; skipped: number; detectedFormat: string } | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Account state
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountType, setNewAccountType] = useState('Checking')
  const [newAccountColor, setNewAccountColor] = useState('#6366f1')
  const [creatingAccount, setCreatingAccount] = useState(false)

  useEffect(() => {
    getAccounts().then(setAccounts)
  }, [])

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) { setError('Only CSV files are supported.'); return }
    setFile(f)
    setStatus('idle')
    setResult(null)
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleAccountSelectChange = (value: string) => {
    if (value === '__new__') {
      setShowNewAccount(true)
      setSelectedAccountId(null)
    } else if (value === '') {
      setShowNewAccount(false)
      setSelectedAccountId(null)
    } else {
      setShowNewAccount(false)
      setSelectedAccountId(Number(value))
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccountName) return
    setCreatingAccount(true)
    try {
      const created = await createAccount({
        name: newAccountName,
        type: newAccountType,
        color: newAccountColor,
      })
      setAccounts(prev => [...prev, created])
      setSelectedAccountId(created.id)
      setShowNewAccount(false)
      setNewAccountName('')
      setNewAccountType('Checking')
      setNewAccountColor('#6366f1')
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setStatus('uploading')
    setError('')
    try {
      const data = await uploadCsv(file, selectedAccountId)
      setResult(data)
      setStatus('success')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Upload failed. Please try again.'
      setError(msg)
      setStatus('error')
    }
  }

  const reset = () => { setFile(null); setStatus('idle'); setResult(null); setError('') }

  const handleDeleteAll = async () => {
    setDeleting(true)
    try {
      await deleteAllTransactions()
      setDeleteConfirm(false)
      reset()
    } finally {
      setDeleting(false)
    }
  }

  const selectValue = showNewAccount ? '__new__' : (selectedAccountId !== null ? String(selectedAccountId) : '')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Upload Bank Statement</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Import your CSV export from your bank to analyse your spending</p>
      </div>

      {/* Supported banks */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5 text-sm text-blue-800 dark:text-blue-300">
        <p className="font-semibold mb-3">Supported banks</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {SUPPORTED_BANKS.map(b => (
            <span key={b} className="bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg text-xs font-medium">
              {b}
            </span>
          ))}
        </div>
        <p className="font-semibold mb-2">How to export from your bank:</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400">
          <li>Log in to your online banking</li>
          <li>Go to your account transactions / history</li>
          <li>Look for an "Export" or "Download" button</li>
          <li>Choose the <strong>CSV format</strong></li>
          <li>Upload the downloaded file here</li>
        </ol>
        <p className="mt-3 text-blue-600 dark:text-blue-400 text-xs">
          Upload multiple files to combine data from different months or accounts. Duplicates are automatically skipped.
        </p>
      </div>

      {/* Account selection */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Assign to account
          </label>
          <select
            value={selectValue}
            onChange={e => handleAccountSelectChange(e.target.value)}
            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">No account / All transactions</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
            <option value="__new__">+ Create new account</option>
          </select>
        </div>

        {/* New account form */}
        {showNewAccount && (
          <form onSubmit={handleCreateAccount} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Account name *</label>
              <input
                type="text"
                placeholder="e.g. Main Checking, Savings"
                value={newAccountName}
                onChange={e => setNewAccountName(e.target.value)}
                required
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Type</label>
                <select
                  value={newAccountType}
                  onChange={e => setNewAccountType(e.target.value)}
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Color</label>
                <div className="flex gap-2 flex-wrap pt-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => setNewAccountColor(c.value)}
                      className={`w-6 h-6 rounded-full transition ring-2 ring-offset-2 ${
                        newAccountColor === c.value ? 'ring-primary-500' : 'ring-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creatingAccount}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition"
              >
                {creatingAccount ? 'Creating…' : 'Create account'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewAccount(false); setNewAccountName('') }}
                className="px-3 py-2 text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-10 text-center transition-all
          ${dragOver
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : file
              ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-default'
              : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900 cursor-pointer'
          }
        `}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

        {!file ? (
          <>
            <Upload className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-medium text-slate-600 dark:text-slate-300">Drop your CSV file here</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">or click to browse</p>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary-500" />
              <div className="text-left">
                <p className="font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button onClick={reset} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl p-4 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {status === 'success' && result && (
        <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl p-4 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{result.message}</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <span>Imported: <strong>{result.imported}</strong></span>
              <span>Skipped: <strong>{result.skipped}</strong></span>
              <span>Detected: <strong>{result.detectedFormat}</strong></span>
            </div>
            <p className="mt-3">
              <a href="/" className="underline font-medium">View your dashboard →</a>
            </p>
          </div>
        </div>
      )}

      {file && status !== 'success' && (
        <button
          onClick={handleUpload}
          disabled={status === 'uploading'}
          className="w-full py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 disabled:opacity-60 transition"
        >
          {status === 'uploading' ? 'Importing…' : 'Import Transactions'}
        </button>
      )}

      {status === 'success' && (
        <button onClick={reset} className="w-full py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          Upload another file
        </button>
      )}

      {/* Danger zone */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-2">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">Danger zone</p>
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete all transactions & start fresh
          </button>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">Are you sure?</p>
            <p className="text-xs text-red-600 dark:text-red-400 mb-4">
              This will permanently delete all imported transactions. Useful if characters like æ, ø, å look wrong — delete and re-upload your CSV file.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition"
              >
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
