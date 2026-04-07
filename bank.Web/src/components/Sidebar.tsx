import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, Receipt, Upload, TrendingUp, Sun, Moon, PiggyBank, LogOut } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { getKeycloak } from '../keycloak'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: List, label: 'Transactions' },
  { to: '/recurring', icon: Receipt, label: 'Recurring Expenses' },
  { to: '/budget-account', icon: PiggyBank, label: 'Budget Account' },
  { to: '/upload', icon: Upload, label: 'Upload Statement' },
]

export default function Sidebar() {
  const { theme, toggle } = useTheme()
  const kc = getKeycloak()
  const username: string = (kc.tokenParsed as Record<string, string> | undefined)?.['preferred_username'] ?? 'Account'

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">BudgetWise</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Personal Finance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {/* User info */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary-700 dark:text-primary-400">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">{username}</p>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => kc.logout()}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
          <button
            onClick={toggle}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  )
}
