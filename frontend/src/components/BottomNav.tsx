import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Tasks', icon: '📋' },
  { to: '/new', label: 'Add', icon: '➕' },
  { to: '/contexts', label: 'Contexts', icon: '🗂️' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium ${
              isActive ? 'text-blue-600' : 'text-slate-500'
            }`
          }
        >
          <span className="text-xl">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
