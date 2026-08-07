import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  FileText, 
  TrendingUp, 
  Sparkles, 
  Stethoscope, 
  Lock, 
  LogOut, 
  Bell, 
  Moon, 
  Sun,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertCount: number;
  onOpenAlerts: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  onOpenAlerts,
  darkMode,
  setDarkMode
}) => {
  const { user, userProfile, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: Activity },
    { id: 'reports', label: 'Reports & Upload', shortLabel: 'Reports', icon: FileText },
    { id: 'trends', label: 'Biomarker Trends', shortLabel: 'Trends', icon: TrendingUp },
    { id: 'insights', label: 'AI Health Insights', shortLabel: 'AI Insights', icon: Sparkles },
    { id: 'doctor-summary', label: 'Doctor Visit Summary', shortLabel: 'Doctor Summary', icon: Stethoscope },
    { id: 'privacy', label: 'Privacy & Security', shortLabel: 'Privacy', icon: Lock },
    { id: 'profile', label: 'Profile', shortLabel: 'Profile', icon: UserIcon },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#16181c]/90 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#ec003f] to-[#f43f5e] flex items-center justify-center text-white shadow-md shadow-[#ec003f]/20">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Aroveda<span className="text-[#ec003f] font-black">AI</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden 2xl:block">
                Secure Lab Report Analytics & Health Record
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md p-1 rounded-2xl border border-white/30 dark:border-white/10 shadow-sm shrink min-w-0 max-w-full overflow-x-auto no-scrollbar [scrollbar-width:none]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#ec003f] text-white shadow-md shadow-[#ec003f]/25 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="hidden xl:inline">{item.label}</span>
                  <span className="xl:hidden">{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Toggle theme mode"
            >
              {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />}
            </button>

            {/* Notifications Alert Bell */}
            <button
              onClick={onOpenAlerts}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Smart Health Alerts"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {alertCount}
                </span>
              )}
            </button>

            {/* User Profile / Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-slate-700">
              <button 
                onClick={() => setActiveTab('profile')}
                className="hidden xl:flex flex-col text-right hover:opacity-80 transition-opacity cursor-pointer"
                title="Manage Profile"
              >
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
                  {userProfile?.displayName || user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Authenticated
                </span>
              </button>
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-200 dark:border-slate-700 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border ${
                  isActive
                    ? 'bg-[#ec003f] text-white border-[#ec003f] shadow-md shadow-[#ec003f]/20'
                    : 'bg-white/30 dark:bg-[#121418]/30 text-slate-700 dark:text-slate-300 border-white/30 dark:border-white/10 backdrop-blur-md'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
