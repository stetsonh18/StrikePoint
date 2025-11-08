import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { useSidebarStore } from '../../application/stores/sidebar.store';
import { NAVIGATION_ITEMS } from '../../shared/constants/navigation';

export const Sidebar = () => {
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  return (
    <aside
      className={`
        ${isCollapsed ? 'w-20' : 'w-72'}
        bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950
        border-r border-slate-800/50 backdrop-blur-xl
        flex flex-col transition-all duration-300 relative
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative p-6 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-glow-sm">
              <Zap className="w-6 h-6 text-slate-950" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                StrikePoint
              </h1>
              <p className="text-xs text-slate-500">Trading Journal</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-glow-sm">
            <Zap className="w-6 h-6 text-slate-950" fill="currentColor" />
          </div>
        )}
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all hover:shadow-glow-sm z-10"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      <nav className="relative flex-1 px-3 py-4 space-y-1.5">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `
                group relative flex items-center px-4 py-3.5 rounded-xl transition-all duration-200
                ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 text-emerald-400 shadow-glow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }
                ${isCollapsed ? 'justify-center' : 'gap-3'}
              `
              }
              title={isCollapsed ? item.name : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-r-full" />
                  )}
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'drop-shadow-glow' : ''}`} />
                  {!isCollapsed && (
                    <span className="font-medium text-sm">{item.name}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={`relative p-4 border-t border-slate-800/50 ${isCollapsed ? 'px-3' : ''}`}>
        <div className={`bg-gradient-to-br from-emerald-500/10 to-transparent rounded-xl p-4 border border-emerald-500/20 ${isCollapsed ? 'p-2' : ''}`}>
          {!isCollapsed ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-400">Win Rate</p>
              <p className="text-2xl font-bold text-white">68.5%</p>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-[68.5%] bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs font-bold text-emerald-400">68%</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
