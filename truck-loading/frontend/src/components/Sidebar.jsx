import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Factory,
  Calendar,
  ClipboardList,
  Users,
  Settings,
  Fuel
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/stations', icon: Factory, label: 'Stations' },
  { path: '/slots', icon: Calendar, label: 'Loading Slots' },
  { path: '/reservations', icon: ClipboardList, label: 'Reservations' },
  { path: '/customers', icon: Users, label: 'Customers' },
]

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-sidebar-gradient border-r border-gray-200">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-mint-600 rounded-lg flex items-center justify-center">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-lg">LNG Load Hub</h1>
            <p className="text-xs text-gray-500">Truck Loading System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-mint-600 shadow-sm border-l-4 border-mint-600 -ml-1 pl-5'
                      : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
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

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-white/50 hover:text-gray-900 transition-all duration-200 w-full">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
