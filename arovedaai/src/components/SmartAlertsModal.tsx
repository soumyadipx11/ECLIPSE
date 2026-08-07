import React from 'react';
import { Bell, X, AlertTriangle, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { SmartAlert } from '../types';

interface SmartAlertsModalProps {
  alerts: SmartAlert[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToReport: (reportId?: string) => void;
  onClearAlerts?: () => void;
  onDismissAlert?: (alertId: string) => void;
}

export const SmartAlertsModal: React.FC<SmartAlertsModalProps> = ({
  alerts,
  isOpen,
  onClose,
  onNavigateToReport,
  onClearAlerts,
  onDismissAlert
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Smart Health Alerts</h2>
              <p className="text-[11px] text-slate-400">Automated flags for abnormal biomarkers and checkup reminders</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {alerts.length > 0 && onClearAlerts && (
              <button
                onClick={onClearAlerts}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear all alerts"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No active alerts</p>
            <p>All lab test values are within optimal ranges and no rechecks are currently due.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-2xl border text-xs transition-all space-y-1 relative group ${
                  alert.type === 'abnormal'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 hover:border-amber-500'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200 hover:border-rose-500'
                }`}
              >
                <div className="flex items-center justify-between font-bold pr-6">
                  <span
                    onClick={() => {
                      onNavigateToReport(alert.reportId);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 cursor-pointer hover:underline"
                  >
                    {alert.type === 'abnormal' ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> : <Clock className="w-4 h-4 text-rose-500 shrink-0" />}
                    {alert.title}
                  </span>
                  <span className="text-[10px] opacity-70 shrink-0">{alert.createdAt?.slice(0, 10)}</span>
                </div>
                <p
                  onClick={() => {
                    onNavigateToReport(alert.reportId);
                    onClose();
                  }}
                  className="text-[11px] leading-relaxed opacity-90 cursor-pointer"
                >
                  {alert.message}
                </p>

                {onDismissAlert && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismissAlert(alert.id);
                    }}
                    className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                    title="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex items-center justify-between gap-3">
          {alerts.length > 0 && onClearAlerts && (
            <button
              onClick={onClearAlerts}
              className="w-1/2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 font-bold py-2.5 rounded-2xl text-xs hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Clear All Alerts
            </button>
          )}
          <button
            onClick={onClose}
            className={`${alerts.length > 0 && onClearAlerts ? 'w-1/2' : 'w-full'} bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-2xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer`}
          >
            Close Alerts
          </button>
        </div>
      </div>
    </div>
  );
};
