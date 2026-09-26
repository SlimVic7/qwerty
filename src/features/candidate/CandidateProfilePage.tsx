import React, { useState, useEffect } from 'react';
import { authFetch } from '../../lib/authFetch.js';
import { CandidateCVParseReview } from './CandidateCVParseReview.js';
import { CandidateTalentPoolCard } from './CandidateTalentPoolCard.js';
import { CandidateAlignmentsList } from './CandidateAlignmentsList.js';

export function CandidateProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [cvs, setCvs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    fetchProfile();
    fetchCVs();
  }, []);
  
  const fetchProfile = async () => {
    try { const data = await authFetch('/api/candidate/profile'); setProfile(data); } catch (e) { console.error(e); }
  };
  
  const fetchCVs = async () => {
    try { const data = await authFetch('/api/candidate/cvs'); setCvs(data); } catch (e) { console.error(e); }
  };
  
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };
  
  const saveProfile = async () => {
    setSaving(true);
    await authFetch('/api/candidate/profile', { method: 'PATCH', body: JSON.stringify(profile) });
    setSaving(false);
  };
  
  const uploadCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('cvFile', file);
    
    try {
      await authFetch('/api/candidate/cvs', { method: 'POST', body: formData });
      fetchCVs();
    } catch (err: any) {
      alert(err.message || 'Unable to upload CV. Please try again.');
    } finally {
      setUploading(false);
      // reset file input
      e.target.value = '';
    }
  };
  
  const downloadCV = async (cvId: string) => {
    try { const { signedUrl } = await authFetch(`/api/candidate/cvs/${cvId}/access`); window.open(signedUrl, '_blank'); } catch (e) { console.error(e); }
  };
  
  const deleteCV = async (cvId: string) => {
    if (!confirm('Are you sure you want to remove this CV?')) return;
    try { await authFetch(`/api/candidate/cvs/${cvId}`, { method: 'DELETE' }); fetchCVs(); } catch (e) { console.error(e); }
  };

  const currentCv = cvs.find(cv => cv.is_current);
  const oldCvs = cvs.filter(cv => !cv.is_current);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8 text-neutral-900">Professional Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6 self-start">
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">Profile Details</h2>
            {profile && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Display Name</label>
                  <input name="display_name" value={profile.display_name || ''} onChange={handleProfileChange} className="w-full rounded-md border-neutral-300 shadow-sm p-2 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Professional Headline</label>
                  <input name="professional_headline" value={profile.professional_headline || ''} onChange={handleProfileChange} className="w-full rounded-md border-neutral-300 shadow-sm p-2 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Professional Summary</label>
                  <textarea name="professional_summary" value={profile.professional_summary || ''} onChange={handleProfileChange} rows={3} className="w-full rounded-md border-neutral-300 shadow-sm p-2 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Years of Experience</label>
                  <input type="number" name="years_experience" value={profile.years_experience || ''} onChange={handleProfileChange} className="w-full rounded-md border-neutral-300 shadow-sm p-2 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">City</label>
                    <input name="city" value={profile.city || ''} onChange={handleProfileChange} className="w-full rounded-md border-neutral-300 shadow-sm p-2 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Country</label>
                    <input name="country" value={profile.country || ''} onChange={handleProfileChange} className="w-full rounded-md border-neutral-300 shadow-sm p-2 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">LinkedIn URL</label>
                  <input name="linkedin_url" value={profile.linkedin_url || ''} onChange={handleProfileChange} className="w-full rounded-md border-neutral-300 shadow-sm p-2 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white" />
                </div>
                <button onClick={saveProfile} disabled={saving} className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-medium py-2 px-4 rounded-md w-full mt-4">
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}
          </div>
          <CandidateTalentPoolCard />
        </div>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-white">Curriculum Vitae (CV)</h2>
            <p className="text-sm text-neutral-500 mb-6">
              Your CV is private to your account. Uploading a CV does not automatically make your profile available to recruiters.
            </p>
            
            {currentCv ? (
              <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 mb-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-neutral-900 dark:text-white">Current CV (v{currentCv.version_number})</h3>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate mt-0.5" title={currentCv.original_filename}>{currentCv.original_filename}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Uploaded {new Date(currentCv.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex-shrink-0 space-x-3">
                    <button onClick={() => downloadCV(currentCv.id)} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">View</button>
                    <button onClick={() => deleteCV(currentCv.id)} className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium">Remove</button>
                  </div>
                </div>
                <CandidateCVParseReview cvId={currentCv.id} onApplied={() => { fetchProfile(); }} />
              </div>
            ) : (
              <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 text-center mb-4 border-dashed">
                <p className="text-neutral-600 dark:text-neutral-400 font-medium mb-2">No CV uploaded</p>
                <p className="text-sm text-neutral-500 mb-4">Upload your CV to easily apply to roles.</p>
              </div>
            )}
            
            <div>
              <label className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-medium py-2 px-4 rounded-md cursor-pointer block text-center w-full">
                {uploading ? 'Uploading...' : (currentCv ? 'Replace CV' : 'Upload CV')}
                <input type="file" accept=".pdf,.doc,.docx" onChange={uploadCV} className="hidden" disabled={uploading} />
              </label>
              <p className="text-xs text-center text-neutral-500 mt-2">Supported formats: PDF, DOCX (Max 5MB)</p>
            </div>
          </div>
          
          {oldCvs.length > 0 && (
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">Previous Versions</h2>
              <ul className="space-y-3">
                {oldCvs.map(cv => (
                  <li key={cv.id} className="flex justify-between items-center text-sm border-b border-neutral-100 dark:border-neutral-700 pb-3 last:border-0 last:pb-0 gap-4">
                    <div className="min-w-0 flex-1 flex items-center gap-1.5">
                      <span className="font-medium text-neutral-900 dark:text-white whitespace-nowrap">v{cv.version_number}</span>
                      <span className="text-neutral-400 dark:text-neutral-500 flex-shrink-0">-</span>
                      <span className="text-neutral-700 dark:text-neutral-300 truncate" title={cv.original_filename}>
                        {cv.original_filename}
                      </span>
                    </div>
                    <button onClick={() => downloadCV(cv.id)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium whitespace-nowrap flex-shrink-0">Download</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <CandidateAlignmentsList />
        </div>
      </div>
    </div>
  );
}
