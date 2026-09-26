import React, { useState, useEffect } from 'react';
import { authFetch } from '../../lib/authFetch.js';

export function CandidateTalentPoolCard() {
  const [preferences, setPreferences] = useState<{
    is_visible_to_qwerty_recruitment: boolean;
    allow_cv_access: boolean;
    consent_given_at: string | null;
    withdrawn_at: string | null;
    consent_version: string | null;
  }>({
    is_visible_to_qwerty_recruitment: false,
    allow_cv_access: false,
    consent_given_at: null,
    withdrawn_at: null,
    consent_version: 'talent-pool-v1'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const data = await authFetch('/api/candidate/talent-pool');
      setPreferences({
        is_visible_to_qwerty_recruitment: Boolean(data.is_visible_to_qwerty_recruitment),
        allow_cv_access: Boolean(data.allow_cv_access),
        consent_given_at: data.consent_given_at || null,
        withdrawn_at: data.withdrawn_at || null,
        consent_version: data.consent_version || 'talent-pool-v1'
      });
    } catch (err: any) {
      console.error('Failed to load talent pool preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOptIn = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVisible = e.target.checked;
    setSaving(true);
    setSaveMessage(null);

    try {
      const payload: { is_visible_to_qwerty_recruitment: boolean; allow_cv_access?: boolean } = {
        is_visible_to_qwerty_recruitment: newVisible
      };

      if (!newVisible) {
        payload.allow_cv_access = false;
      }

      const updated = await authFetch('/api/candidate/talent-pool', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setPreferences({
        is_visible_to_qwerty_recruitment: Boolean(updated.is_visible_to_qwerty_recruitment),
        allow_cv_access: Boolean(updated.allow_cv_access),
        consent_given_at: updated.consent_given_at || null,
        withdrawn_at: updated.withdrawn_at || null,
        consent_version: updated.consent_version || 'talent-pool-v1'
      });

      setSaveMessage(newVisible ? 'Opt-in confirmed. Profile is available to recruiters.' : 'Withdrawn from Talent Pool.');
    } catch (err: any) {
      console.error('Error saving talent pool preference:', err);
      alert(err.message || 'Failed to update preference');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCvAccess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCvAccess = e.target.checked;
    if (!preferences.is_visible_to_qwerty_recruitment) {
      alert('You must first opt into the QWERTY Talent Pool before granting CV access.');
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const updated = await authFetch('/api/candidate/talent-pool', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_cv_access: newCvAccess })
      });

      setPreferences(prev => ({
        ...prev,
        allow_cv_access: Boolean(updated.allow_cv_access)
      }));

      setSaveMessage(newCvAccess ? 'Recruiter CV access enabled.' : 'Recruiter CV access disabled.');
    } catch (err: any) {
      console.error('Error saving CV access preference:', err);
      alert(err.message || 'Failed to update CV access');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700">
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">QWERTY Talent Pool</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Control your recruitment visibility and CV sharing permissions with authorized QWERTY recruiters.
          </p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
            preferences.is_visible_to_qwerty_recruitment
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
          }`}
        >
          {preferences.is_visible_to_qwerty_recruitment ? 'Active in Talent Pool' : 'Not Participating'}
        </span>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-500 py-3">Loading preferences...</div>
      ) : (
        <div className="space-y-4 pt-2">
          {/* Main Opt-in */}
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
            <input
              type="checkbox"
              checked={preferences.is_visible_to_qwerty_recruitment}
              onChange={handleToggleOptIn}
              disabled={saving}
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="text-sm">
              <span className="font-medium text-neutral-900 dark:text-white block">
                Make my profile available to QWERTY Recruitment
              </span>
              <span className="text-neutral-500 dark:text-neutral-400 block mt-0.5 text-xs">
                Authorized recruiters can discover your approved professional profile (headline, experience summary, approved skills). Your private contact information (phone and email) is never exposed.
              </span>
            </div>
          </label>

          {/* CV Access Permission (Separate Control) */}
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border border-neutral-100 dark:border-neutral-700 transition-colors ${
              preferences.is_visible_to_qwerty_recruitment
                ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                : 'opacity-50 cursor-not-allowed bg-neutral-50/50 dark:bg-neutral-900/20'
            }`}
          >
            <input
              type="checkbox"
              checked={preferences.allow_cv_access}
              onChange={handleToggleCvAccess}
              disabled={saving || !preferences.is_visible_to_qwerty_recruitment}
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="text-sm">
              <span className="font-medium text-neutral-900 dark:text-white block">
                Allow authorized recruiters to view my current CV
              </span>
              <span className="text-neutral-500 dark:text-neutral-400 block mt-0.5 text-xs">
                When enabled, verified recruiters can request a short-lived, audited link to view your current CV document. If disabled, recruiters can only view your approved profile.
              </span>
            </div>
          </label>

          {/* Transparency & Consent Note */}
          <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-md text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
            <p>
              • <strong>Privacy by Default:</strong> Joining the Talent Pool is completely optional. Uploading a CV or running an ATS assessment does not opt you in.
            </p>
            <p>
              • <strong>Instant Withdrawal:</strong> You can withdraw at any time by unchecking the box. Your profile will immediately disappear from recruiter searches.
            </p>
            {preferences.consent_given_at && (
              <p className="pt-1 text-neutral-400 dark:text-neutral-500">
                Consented at: {new Date(preferences.consent_given_at).toLocaleString()} (Version: {preferences.consent_version})
              </p>
            )}
            {preferences.withdrawn_at && !preferences.is_visible_to_qwerty_recruitment && (
              <p className="pt-1 text-neutral-400 dark:text-neutral-500">
                Withdrawn at: {new Date(preferences.withdrawn_at).toLocaleString()}
              </p>
            )}
          </div>

          {saveMessage && (
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {saveMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
