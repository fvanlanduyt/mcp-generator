import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  PlusCircle,
  Tags,
  Settings,
  Palmtree
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/holiday-types', icon: Tags, label: 'Holiday Types' },
  { to: '/requests', icon: FileText, label: 'Requests' },
  { to: '/requests/new', icon: PlusCircle, label: 'New Request' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-60 bg-sidebar-gradient border-r border-mint-200">
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mint-600 rounded-lg flex items-center justify-center">
              <Palmtree className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-800">Holidays</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-mint-600 text-white'
                        : 'text-gray-600 hover:bg-mint-100 hover:text-mint-700'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Settings at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-mint-200">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-mint-100 hover:text-mint-700 w-full transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-60 flex-1 bg-main-gradient min-h-screen p-8">
        <Outlet />
      </main>
    </div>
  )
}
