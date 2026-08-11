import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  getDocs,
  orderBy
} from '../lib/firebase';
import { 
  LabReport, 
  AuditLogEntry, 
  SmartAlert, 
  BiomarkerTrendSummary, 
  HealthTrendPoint 
} from '../types';
import { SAMPLE_LAB_REPORTS } from '../data/sampleReports';
import { cleanUndefined } from '../utils/sanitize';
import { normalizeBiomarkerName, areBiomarkersEqual, parseReferenceRange, getStandardReferenceRange } from '../utils/biomarkerNormalizer';

export function useReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<LabReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user reports & alerts from Firestore
  useEffect(() => {
    if (!user) {
      setReports([]);
      setAuditLogs([]);
      setSmartAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Reports query
    const reportsQuery = query(
      collection(db, 'reports'),
      where('userId', '==', user.uid)
    );

    const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
      const docs: LabReport[] = [];
      snapshot.forEach((d) => {
        docs.push({ ...d.data(), id: d.id } as LabReport);
      });
      // Sort chronologically by testDate
      docs.sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime());
      setReports(docs);
      setLoading(false);
      generateAlertsFromReports(docs, user.uid);
    }, (err) => {
      console.error("Firestore reports listener error:", err);
      setLoading(false);
    });

    // Audit logs query
    const auditQuery = query(
      collection(db, 'audit_logs'),
      where('userId', '==', user.uid)
    );

    const unsubAudit = onSnapshot(auditQuery, (snapshot) => {
      const logs: AuditLogEntry[] = [];
      snapshot.forEach((d) => {
        logs.push({ ...d.data(), id: d.id } as AuditLogEntry);
      });
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(logs);
    }, (err) => {
      console.error("Firestore audit logs listener error:", err);
    });

    return () => {
      unsubReports();
      unsubAudit();
    };
  }, [user]);

  // Log an audit entry
  const addAuditLog = async (action: AuditLogEntry['action'], details: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'audit_logs'), cleanUndefined({
        userId: user.uid,
        action,
        details,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error("Failed to write audit log:", e);
    }
  };

  // Generate smart alerts based on abnormal biomarkers and test dates
  const generateAlertsFromReports = (allReports: LabReport[], uid: string) => {
    const alerts: SmartAlert[] = [];
    if (!allReports.length) return;

    // Check latest report
    const latest = allReports[0];
    const abnormalItems = (latest.extractedData || []).filter(b => b.isAbnormal);

    if (abnormalItems.length > 0) {
      alerts.push({
        id: `alert-abnormal-${latest.id}`,
        userId: uid,
        title: `${abnormalItems.length} Abnormal Values Detected in ${latest.title}`,
        message: `In your test from ${latest.testDate}, the following markers were flagged: ${abnormalItems.map(i => i.testName).join(', ')}.`,
        type: 'abnormal',
        read: false,
        createdAt: latest.createdAt,
        reportId: latest.id
      });
    }

    // Check for Vit D or Sugar follow up test due
    const latestDate = new Date(latest.testDate);
    const monthsDiff = (new Date().getTime() - latestDate.getTime()) / (1000 * 3600 * 24 * 30);
    if (monthsDiff > 6) {
      alerts.push({
        id: 'alert-routine-checkup',
        userId: uid,
        title: 'Routine Health Checkup Suggested',
        message: `Your last uploaded report was ${Math.round(monthsDiff)} months ago (${latest.testDate}). Consider discussing a routine follow-up with your doctor.`,
        type: 'reminder',
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    setSmartAlerts(alerts);
  };

  // Add a new report
  const addReport = async (reportData: Omit<LabReport, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error("Must be logged in to add a report.");
    const now = new Date().toISOString();
    const payload = cleanUndefined({
      ...reportData,
      userId: user.uid,
      createdAt: now,
      updatedAt: now
    });
    const docRef = await addDoc(collection(db, 'reports'), payload);
    await addAuditLog('UPLOAD_REPORT', `Uploaded lab report "${reportData.title}" (${reportData.testDate})`);
    return docRef.id;
  };

  // Pre-fill demo lab reports for instant user evaluation
  const loadDemoReports = async () => {
    if (!user) return;
    for (const sample of SAMPLE_LAB_REPORTS) {
      const { id: _ignoreId, ...sampleData } = sample;
      await addDoc(collection(db, 'reports'), cleanUndefined({
        ...sampleData,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    }
    await addAuditLog('UPLOAD_REPORT', 'Loaded 3 sample demonstration lab reports into personal record.');
  };

  // Update a report
  const updateReport = async (reportId: string, updatedFields: Partial<LabReport>) => {
    if (!user) return;
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, cleanUndefined({
      ...updatedFields,
      updatedAt: new Date().toISOString()
    }));
    await addAuditLog('UPDATE_REPORT', `Edited report data for ID ${reportId}`);
  };

  // Delete a single report
  const deleteReport = async (reportId: string, reportTitle: string) => {
    if (!user) return;
    try {
      // Optimistically remove from state
      setReports(prev => prev.filter(r => r.id !== reportId));
      await deleteDoc(doc(db, 'reports', reportId));
      await addAuditLog('DELETE_REPORT', `Permanently deleted report "${reportTitle}"`);
    } catch (e) {
      console.error("Delete report error:", e);
      throw e;
    }
  };

  // Wipe all user data (Privacy requirement)
  const clearAllUserData = async () => {
    if (!user) return;
    try {
      // Optimistically clear UI state
      setReports([]);
      setSmartAlerts([]);
      try {
        localStorage.removeItem('aroveda_ai_insights');
        localStorage.removeItem('aroveda_doctor_summary');
        localStorage.removeItem('aroveda_custom_reminders');
      } catch (e) {}

      // 1. Delete all reports for user
      const qR = query(collection(db, 'reports'), where('userId', '==', user.uid));
      const rSnap = await getDocs(qR);
      await Promise.all(rSnap.docs.map((d) => deleteDoc(d.ref)));

      // 2. Delete all smart alerts for user
      const qS = query(collection(db, 'smart_alerts'), where('userId', '==', user.uid));
      const sSnap = await getDocs(qS);
      await Promise.all(sSnap.docs.map((d) => deleteDoc(d.ref)));

      // 3. Delete all audit logs for user
      const qA = query(collection(db, 'audit_logs'), where('userId', '==', user.uid));
      const aSnap = await getDocs(qA);
      await Promise.all(aSnap.docs.map((d) => deleteDoc(d.ref)));

      // 4. Clear AI Insights & Doctor Visit Summary from user document
      await setDoc(doc(db, 'users', user.uid), {
        aiInsights: null,
        doctorSummary: null,
        customReminders: []
      }, { merge: true }).catch(() => {});

      setAuditLogs([]);
      await addAuditLog('DELETE_ACCOUNT', 'Wiped all personal health reports and audit logs permanently.');
    } catch (e) {
      console.error("Wipe data error:", e);
      throw e;
    }
  };

  // Calculate biomarker trend data over time
  const getBiomarkerTrend = (biomarkerName: string): BiomarkerTrendSummary | null => {
    if (!reports.length) return null;

    const points: HealthTrendPoint[] = [];
    let category = '';
    let unit = '';
    let referenceRange = '';

    // Reports sorted chronologically descending in state, let's reverse for chronological line chart
    const sortedChronological = [...reports].sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());

    const canonicalName = normalizeBiomarkerName(biomarkerName);
    const standardRef = getStandardReferenceRange(canonicalName);

    sortedChronological.forEach(r => {
      const matched = (r.extractedData || []).find(
        b => areBiomarkersEqual(b.testName, biomarkerName)
      );
      if (matched) {
        category = matched.category || category;
        unit = matched.unit || unit;
        referenceRange = matched.referenceRange || referenceRange;

        const refStr = (matched.referenceRange || '').toLowerCase().trim();
        const isLowerOnly = refStr.includes('>') || refStr.includes('greater than') || refStr.includes('above') || refStr.includes('more than');
        const isUpperOnly = refStr.includes('<') || refStr.includes('less than') || refStr.includes('desirable') || refStr.includes('optimal') || refStr.includes('target') || refStr.includes('below') || refStr.includes('up to');

        const parsed = parseReferenceRange(matched.referenceRange);
        let minRef = matched.minRef !== undefined ? Number(matched.minRef) : parsed.minRef;
        let maxRef = matched.maxRef !== undefined ? Number(matched.maxRef) : parsed.maxRef;

        const hasRangeDash = /[0-9]+\s*[-–—]\s*[0-9]+/.test(refStr);

        if (isLowerOnly && !hasRangeDash) {
          maxRef = undefined;
        }
        if (isUpperOnly || minRef === 0 || (minRef !== undefined && maxRef !== undefined && minRef >= maxRef)) {
          minRef = undefined;
        }

        points.push({
          date: r.testDate,
          value: Number(matched.value),
          unit: matched.unit || unit || (standardRef ? standardRef.unit : ''),
          reportTitle: r.title,
          flag: matched.flag,
          minRef,
          maxRef,
          referenceRange: matched.referenceRange || referenceRange || (standardRef ? standardRef.referenceRange : ''),
          standardMinRef: standardRef?.minRef,
          standardMaxRef: standardRef?.maxRef,
          standardReferenceRange: standardRef?.referenceRange
        });
      }
    });

    if (points.length === 0) return null;

    const currentVal = points[points.length - 1].value;
    const previousVal = points.length > 1 ? points[points.length - 2].value : undefined;

    let changePercent: number | undefined = undefined;
    let status: BiomarkerTrendSummary['status'] = 'neutral';

    if (previousVal !== undefined && previousVal !== 0) {
      changePercent = Math.round(((currentVal - previousVal) / previousVal) * 100);
      if (Math.abs(changePercent) < 3) {
        status = 'stable';
      } else if (biomarkerName.toLowerCase().includes('cholesterol') || biomarkerName.toLowerCase().includes('ldl') || biomarkerName.toLowerCase().includes('sugar') || biomarkerName.toLowerCase().includes('hba1c')) {
        // Lower is better for cholesterol and sugar
        status = currentVal < previousVal ? 'improving' : 'declining';
      } else if (biomarkerName.toLowerCase().includes('vitamin') || biomarkerName.toLowerCase().includes('hdl') || biomarkerName.toLowerCase().includes('hemoglobin')) {
        // Higher is better for Vit D / B12 / HDL
        status = currentVal > previousVal ? 'improving' : 'declining';
      } else {
        status = 'stable';
      }
    }

    // Determine reference range strategy:
    // 1. Primary: Use reference range from report.
    // 2. If different reports have different upper limits choose MIN, for different lower limits choose MAX.
    // 3. If no report provides a range: Use Gemini AI clinical reference range.

    const pointsWithReportRange = points.filter(p => p.referenceRange && p.referenceRange.trim() !== '');
    const uniqueReportRanges = Array.from(new Set(pointsWithReportRange.map(p => p.referenceRange?.trim())));

    let chosenReferenceRange = '';
    let chosenMinRef: number | undefined = undefined;
    let chosenMaxRef: number | undefined = undefined;
    let rangeSource: 'report' | 'gemini_ai' = 'report';
    let hasMultipleReportRanges = false;
    let chosenRangeExplanation = '';
    const rangeHistory: { date: string; reportTitle: string; range: string }[] = [];

    points.forEach(p => {
      if (p.referenceRange) {
        rangeHistory.push({
          date: p.date,
          reportTitle: p.reportTitle,
          range: p.referenceRange
        });
      }
    });

    const reportMinRefs: number[] = [];
    const reportMaxRefs: number[] = [];

    pointsWithReportRange.forEach(p => {
      if (p.minRef !== undefined && !isNaN(p.minRef)) {
        reportMinRefs.push(p.minRef);
      }
      if (p.maxRef !== undefined && !isNaN(p.maxRef)) {
        reportMaxRefs.push(p.maxRef);
      }
    });

    if (pointsWithReportRange.length > 0) {
      rangeSource = 'report';

      const chosenMin = reportMinRefs.length > 0 ? Math.max(...reportMinRefs) : undefined;
      const chosenMax = reportMaxRefs.length > 0 ? Math.min(...reportMaxRefs) : undefined;

      chosenMinRef = chosenMin;
      chosenMaxRef = chosenMax;

      const hasMultipleUpper = new Set(reportMaxRefs).size > 1;
      const hasMultipleLower = new Set(reportMinRefs).size > 1;
      hasMultipleReportRanges = uniqueReportRanges.length > 1;

      const unitStr = unit ? ` ${unit}` : '';
      if (chosenMin !== undefined && chosenMax !== undefined) {
        chosenReferenceRange = `${chosenMin} - ${chosenMax}${unitStr}`;
      } else if (chosenMax !== undefined) {
        chosenReferenceRange = `< ${chosenMax}${unitStr}`;
      } else if (chosenMin !== undefined) {
        chosenReferenceRange = `> ${chosenMin}${unitStr}`;
      } else {
        const latestPointWithRange = pointsWithReportRange[pointsWithReportRange.length - 1];
        chosenReferenceRange = latestPointWithRange.referenceRange || '';
      }

      if (hasMultipleUpper || hasMultipleLower || hasMultipleReportRanges) {
        const rules: string[] = [];
        if (hasMultipleUpper && chosenMax !== undefined) {
          rules.push(`upper limit bound set to strictest minimum (${chosenMax}${unitStr})`);
        }
        if (hasMultipleLower && chosenMin !== undefined) {
          rules.push(`lower limit bound set to strictest maximum (${chosenMin}${unitStr})`);
        }
        chosenRangeExplanation = `Consolidated reference range (${chosenReferenceRange}) across multiple lab reports: ${rules.length > 0 ? rules.join(', ') : 'selected strictest limits'}.`;
      } else {
        chosenRangeExplanation = `Reference range extracted directly from lab reports (${chosenReferenceRange}).`;
      }
    } else {
      // Fallback: No reference range was given in reports -> Use Gemini AI clinical guidelines
      rangeSource = 'gemini_ai';
      chosenReferenceRange = standardRef?.referenceRange || '';
      chosenMinRef = standardRef?.minRef;
      chosenMaxRef = standardRef?.maxRef;
      hasMultipleReportRanges = false;
      chosenRangeExplanation = chosenReferenceRange
        ? `No reference range provided in lab reports. Standard reference range generated via Gemini AI clinical guidelines (${chosenReferenceRange}).`
        : 'No reference range available.';
    }

    // Ensure all points carry reference range for tooltip display
    points.forEach(p => {
      if (!p.referenceRange) {
        p.referenceRange = chosenReferenceRange;
        p.minRef = chosenMinRef;
        p.maxRef = chosenMaxRef;
      }
    });

    return {
      biomarkerName: canonicalName || biomarkerName,
      category: category || standardRef?.category || 'Biomarkers',
      currentVal,
      previousVal,
      unit: unit || standardRef?.unit || '',
      changePercent,
      status,
      historicalPoints: points,
      referenceRange: chosenReferenceRange,
      minRef: chosenMinRef,
      maxRef: chosenMaxRef,
      rangeSource,
      hasMultipleReportRanges,
      chosenRangeExplanation,
      rangeHistory,
      standardReference: standardRef || undefined
    };
  };

  const clearAlerts = () => {
    setSmartAlerts([]);
  };

  const dismissAlert = (alertId: string) => {
    setSmartAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  return {
    reports,
    auditLogs,
    smartAlerts,
    loading,
    addReport,
    loadDemoReports,
    updateReport,
    deleteReport,
    clearAllUserData,
    addAuditLog,
    getBiomarkerTrend,
    clearAlerts,
    dismissAlert
  };
}
