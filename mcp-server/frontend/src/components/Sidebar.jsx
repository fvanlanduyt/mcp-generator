import { NavLink } from 'react-router-dom';
import {
  ChartBarIcon,
  ServerStackIcon,
  SparklesIcon,
  BoltIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartBarIcon },
  { name: 'Connections', href: '/connections', icon: ServerStackIcon },
  { name: 'Analyze', href: '/analyze', icon: SparklesIcon },
  { name: 'Capabilities', href: '/capabilities', icon: BoltIcon },
];

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar() {
  return (
    <div className="flex flex-col h-full w-60 bg-gradient-sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-accent-200/50">
        <h1 className="text-xl font-bold text-accent-700">MCP Generator</h1>
        <p className="text-xs text-text-secondary mt-1">Database → AI Bridge</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-accent-700 shadow-sm border-l-4 border-accent-500'
                  : 'text-text-secondary hover:bg-white/50 hover:text-text-primary'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-accent-200/50">
        {bottomNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-accent-700 shadow-sm'
                  : 'text-text-secondary hover:bg-white/50 hover:text-text-primary'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
