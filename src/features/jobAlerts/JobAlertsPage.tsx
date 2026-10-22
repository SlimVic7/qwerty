'use client';

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  MapPin,
  Building2,
  ChevronRight,
  RefreshCw,
  Power,
  X,
  Mail,
  CheckCircle2
} from 'lucide-react';
import {
  jobAlertsService,
  JobAlert,
  JobAlertCreateInput,
  JobAlertMatch
} from './jobAlerts.service.js';

export function JobAlertsPage() {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  // Modal / Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [alertForm, setAlertForm] = useState<JobAlertCreateInput>({
    name: '',
    keywords: '',
    location_query: '',
    workplace_type: '',
    employment_type: '',
    frequency: 'daily',
    is_active: true
  });
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Matches Drawer
  const [matchingAlert, setMatchingAlert] = useState<JobAlert | null>(null);
  const [matches, setMatches] = useState<JobAlertMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoadingAlerts(true);
    setAlertsError(null);
    try {
      const res = await jobAlertsService.getAlerts();
      setAlerts(res.alerts || []);
    } catch (err: any) {
      console.error('[JobAlertsPage] Error loading alerts:', err);
      setAlertsError(err.message || 'Unable to load job alerts.');
    } finally {
      setLoadingAlerts(false);
    }
  }

  const handleOpenCreateModal = () => {
    setEditingAlertId(null);
    setAlertForm({
      name: '',
      keywords: '',
      location_query: '',
      workplace_type: '',
      employment_type: '',
      frequency: 'daily',
      is_active: true
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (targetAlert: JobAlert) => {
    setEditingAlertId(targetAlert.id);
    setAlertForm({
      name: targetAlert.name,
      keywords: targetAlert.keywords || '',
      location_query: targetAlert.location_query || '',
      workplace_type: targetAlert.workplace_type || '',
      employment_type: targetAlert.employment_type || '',
      frequency: targetAlert.frequency || 'daily',
      is_active: targetAlert.is_active
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.name.trim()) {
      setFormError('Alert name is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingAlertId) {
        const updated = await jobAlertsService.updateAlert(editingAlertId, alertForm);
        setAlerts(prev => prev.map(a => a.id === editingAlertId ? updated : a));
      } else {
        const created = await jobAlertsService.createAlert(alertForm);
        setAlerts(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('[JobAlertsPage] Error saving alert:', err);
      setFormError(err.message || 'Failed to save job alert.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      setAlertsError(null);
      await jobAlertsService.deleteAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      if (matchingAlert?.id === alertId) {
        setMatchingAlert(null);
        setMatches([]);
      }
    } catch (err: any) {
      console.error('[JobAlertsPage] Delete error:', err);
      setAlertsError(err.message || 'Failed to delete alert.');
    }
  };

  const handleToggleAlert = async (targetAlert: JobAlert) => {
    try {
      setAlertsError(null);
      const updated = await jobAlertsService.toggleAlert(targetAlert.id, !targetAlert.is_active);
      setAlerts(prev => prev.map(a => a.id === targetAlert.id ? updated : a));
    } catch (err: any) {
      console.error('[JobAlertsPage] Toggle error:', err);
      setAlertsError(err.message || 'Failed to toggle alert status.');
    }
  };

  const handlePreviewMatches = async (targetAlert: JobAlert) => {
    setMatchingAlert(targetAlert);
    setLoadingMatches(true);
    try {
      const res = await jobAlertsService.getAlertMatches(targetAlert.id, 20);
      setMatches(res.matches || []);
    } catch (err: any) {
      console.error('[JobAlertsPage] Preview matches error:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const formatCriterionName = (key: string) => {
    switch (key) {
      case 'keywords': return 'Keywords';
      case 'location_query': return 'Location';
      case 'workplace_type': return 'Workplace Mode';
      case 'employment_type': return 'Employment Type';
      default: return key;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#0B3D2E]" />
            Job Alerts
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure automated vacancy alerts and discover matching opportunities across QWERTY.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3D2E] hover:bg-[#1E6B50] text-white rounded-md text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Job Alert
        </button>
      </div>

      {/* Production Notification Delivery Status Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-sm text-slate-700">
        <Mail className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-900">
            Email Delivery & Automated Alerts — Coming Soon
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            The Job Alerts workspace and live vacancy discovery are fully operational. Automated email digests will begin dispatching once external notification delivery infrastructure is configured.
          </p>
        </div>
      </div>

      {alertsError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {alertsError}
        </div>
      )}

      {/* Alerts Count Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Configured Alerts: <strong className="text-slate-800">{alerts.length}</strong> / 10 maximum</span>
        <span>Delivery cadence options: Daily digest, Weekly summary</span>
      </div>

      {loadingAlerts ? (
        <div className="py-16 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B3D2E]" />
          Loading your job alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-emerald-50 text-[#0B3D2E] rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No Job Alerts Configured</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-1 mb-6">
            Never miss a relevant role. Create targeted search alerts for your desired titles, keywords, locations, and workplace arrangements.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3D2E] text-white rounded-md text-sm font-medium hover:bg-[#1E6B50] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map(targetAlert => (
            <div
              key={targetAlert.id}
              className={`border rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between transition-all ${
                targetAlert.is_active ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 text-base">{targetAlert.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        targetAlert.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {targetAlert.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {targetAlert.frequency === 'weekly' ? 'Weekly' : 'Daily'}
                  </span>
                </div>

                {/* Criteria Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3 text-xs text-slate-600">
                  {targetAlert.keywords && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                      Keywords: <span className="font-medium text-slate-800">{targetAlert.keywords}</span>
                    </span>
                  )}
                  {targetAlert.location_query && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {targetAlert.location_query}
                    </span>
                  )}
                  {targetAlert.workplace_type && targetAlert.workplace_type !== 'unspecified' && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded capitalize">
                      {targetAlert.workplace_type}
                    </span>
                  )}
                  {targetAlert.employment_type && targetAlert.employment_type !== 'unspecified' && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded capitalize">
                      {targetAlert.employment_type.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-sm">
                <button
                  onClick={() => handlePreviewMatches(targetAlert)}
                  className="text-[#0B3D2E] hover:underline font-semibold inline-flex items-center gap-1 text-xs"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  View Current Matches
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAlert(targetAlert)}
                    title={targetAlert.is_active ? 'Pause Alert' : 'Activate Alert'}
                    className={`p-1.5 rounded transition-colors ${
                      targetAlert.is_active
                        ? 'text-slate-600 hover:bg-slate-100'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(targetAlert)}
                    title="Edit Alert"
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAlert(targetAlert.id)}
                    title="Delete Alert"
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Matches Section */}
      {matchingAlert && (
        <div className="mt-8 border border-slate-200 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Matching Vacancies for: <span className="text-[#0B3D2E]">{matchingAlert.name}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Deterministic matches meeting all configured criteria for this alert.
              </p>
            </div>
            <button
              onClick={() => setMatchingAlert(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loadingMatches ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0B3D2E]" />
              Checking published vacancies...
            </div>
          ) : matches.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              No active published vacancies currently meet all configured criteria for this alert.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
              {matches.map(m => (
                <div key={m.job.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/jobs/${m.job.slug || m.job.id}`}
                        className="font-semibold text-slate-900 hover:text-[#0B3D2E] text-base"
                      >
                        {m.job.title}
                      </Link>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        Matched
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {m.job.company_name}
                      </span>
                      {m.job.location_text && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {m.job.location_text}
                        </span>
                      )}
                      {m.job.workplace_type && (
                        <span className="capitalize">{m.job.workplace_type}</span>
                      )}
                    </div>

                    {/* Matched criteria badges */}
                    {m.matched_criteria.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.matched_criteria.map((c, i) => (
                          <span key={i} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {formatCriterionName(c)}: Matched
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/jobs/${m.job.slug || m.job.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#0B3D2E] hover:underline shrink-0"
                  >
                    View Advert
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT JOB ALERT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAlertId ? 'Edit Job Alert' : 'Create New Job Alert'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alert Name *
                </label>
                <input
                  type="text"
                  required
                  value={alertForm.name}
                  onChange={e => setAlertForm({ ...alertForm, name: e.target.value })}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keywords (Optional)
                </label>
                <input
                  type="text"
                  value={alertForm.keywords || ''}
                  onChange={e => setAlertForm({ ...alertForm, keywords: e.target.value })}
                  placeholder="e.g. React, TypeScript, GraphQL"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location Query (Optional)
                  </label>
                  <input
                    type="text"
                    value={alertForm.location_query || ''}
                    onChange={e => setAlertForm({ ...alertForm, location_query: e.target.value })}
                    placeholder="e.g. London"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Workplace Mode
                  </label>
                  <select
                    value={alertForm.workplace_type || ''}
                    onChange={e => setAlertForm({ ...alertForm, workplace_type: e.target.value || null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]"
                  >
                    <option value="">Any Mode</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Onsite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employment Type
                </label>
                <select
                  value={alertForm.employment_type || ''}
                  onChange={e => setAlertForm({ ...alertForm, employment_type: e.target.value || null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]"
                >
                  <option value="">Any Type</option>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cadence
                </label>
                <select
                  value={alertForm.frequency || 'daily'}
                  onChange={e => setAlertForm({ ...alertForm, frequency: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]"
                >
                  <option value="daily">Daily Digest</option>
                  <option value="weekly">Weekly Summary</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="alert_active_toggle"
                  checked={alertForm.is_active}
                  onChange={e => setAlertForm({ ...alertForm, is_active: e.target.checked })}
                  className="rounded text-[#0B3D2E] focus:ring-[#0B3D2E]"
                />
                <label htmlFor="alert_active_toggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Activate this alert immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-[#0B3D2E] text-white rounded text-sm font-semibold hover:bg-[#1E6B50] transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingAlertId ? 'Update Alert' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
