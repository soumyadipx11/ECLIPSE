import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useReports } from './hooks/useReports';
import { AuthScreen } from './components/AuthScreen';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ReportUpload } from './components/ReportUpload';
import { ReportTimeline } from './components/ReportTimeline';
import { BiomarkerTrends } from './components/BiomarkerTrends';
import { AiInsightsView } from './components/AiInsightsView';
import { DoctorVisitSummary } from './components/DoctorVisitSummary';
import { PrivacyCenter } from './components/PrivacyCenter';
import { ProfileView } from './components/ProfileView';
import { SmartAlertsModal } from './components/SmartAlertsModal';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { 
    reports, 
    auditLogs, 
    smartAlerts, 
    loading: reportsLoading, 
    addReport, 
    loadDemoReports, 
    deleteReport, 
    clearAllUserData, 
    getBiomarkerTrend,
    clearAlerts,
    dismissAlert
  } = useReports();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aroveda_theme');
      if (saved !== null) {
        return saved === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLoadDemo = async () => {
    try {
      await loadDemoReports();
      triggerNotification('Demo lab data loaded successfully!');
    } catch (err) {
      console.error("Load demo error:", err);
    }
  };

  // Sync dark mode class with root html and body elements
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (darkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
      localStorage.setItem('aroveda_theme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      localStorage.setItem('aroveda_theme', 'light');
    }
  }, [darkMode]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    document.documentElement.scrollTo({ top: 0, left: 0 });
    document.body.scrollTo({ top: 0, left: 0 });
  }, [activeTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#16181c] flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Initializing Encrypted ArovedaAI Platform...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Fixed background and decorative glowing circles that do not scroll */}
      <div className="fixed inset-0 bg-gradient-to-tr from-slate-100 via-rose-50/20 to-rose-50/10 dark:from-[#16181c] dark:via-[#16181c] dark:to-[#16181c] pointer-events-none z-0" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#ec003f]/30 to-[#ff2b66]/10 dark:from-[#ec003f]/35 dark:to-[#ff2b66]/15 blur-[120px] animate-heartbeat-glow" />
        <div className="absolute bottom-[10%] left-[-15%] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-rose-500/10 to-rose-600/10 dark:from-rose-900/15 dark:to-rose-950/15 blur-[130px] animate-heartbeat-glow-delayed" />
        <div className="absolute top-[40%] right-[5%] w-[450px] h-[450px] rounded-full bg-gradient-to-bl from-amber-500/10 to-rose-600/20 dark:from-amber-950/10 dark:to-[#ec003f]/25 blur-[110px] animate-heartbeat-glow" />
      </div>

      <div className="relative z-10">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          alertCount={smartAlerts.length}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 lg:pt-24 pb-12">
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -20, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -20, x: '-50%' }}
                className="fixed top-24 left-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-emerald-600/20 text-xs font-bold flex items-center gap-2 border border-emerald-500/50 backdrop-blur-md"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                {notification}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'dashboard' && (
                <Dashboard
                  reports={reports}
                  loading={reportsLoading}
                  onNavigate={setActiveTab}
                  onLoadDemo={handleLoadDemo}
                  getBiomarkerTrend={getBiomarkerTrend}
                />
              )}

              {activeTab === 'reports' && (
                <div className="space-y-8">
                  <ReportUpload
                    onSaveReport={addReport}
                    onLoadDemo={handleLoadDemo}
                    onSuccess={() => setActiveTab('reports')}
                  />
                  <ReportTimeline
                    reports={reports}
                    onDeleteReport={deleteReport}
                    onNavigateToUpload={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  />
                </div>
              )}

              {activeTab === 'trends' && (
                <BiomarkerTrends
                  reports={reports}
                  getBiomarkerTrend={getBiomarkerTrend}
                />
              )}

              {activeTab === 'insights' && (
                <AiInsightsView reports={reports} />
              )}

              {activeTab === 'doctor-summary' && (
                <DoctorVisitSummary reports={reports} />
              )}

              {activeTab === 'privacy' && (
                <PrivacyCenter
                  auditLogs={auditLogs}
                  onClearAllData={clearAllUserData}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView totalReportsCount={reports.length} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <SmartAlertsModal
        alerts={smartAlerts}
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onNavigateToReport={() => setActiveTab('reports')}
        onClearAlerts={clearAlerts}
        onDismissAlert={dismissAlert}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
