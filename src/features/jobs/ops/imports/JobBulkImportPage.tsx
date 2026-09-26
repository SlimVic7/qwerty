import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobImportsService } from './jobImports.service.js';
import { Settings2 } from 'lucide-react';

export function JobBulkImportPage() {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAnalyse = async () => {
    if (!rawText.trim()) {
      setError('Please provide some job advertisements to analyse.');
      return;
    }

    if (rawText.length > 2000000) {
      setError('Text is too large. Please paste fewer jobs at once.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const batch = await jobImportsService.createBatch(rawText);
      navigate(`/0ps26/jobs/imports/${batch.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create batch');
      setLoading(false);
    }
  };

  const handleClear = () => {
    setRawText('');
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Bulk Job Import</h1>
        
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
          <Settings2 className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Gemini AI Engine Active</span>
        </div>
      </div>
      <p className="text-slate-600 mb-6">
        Paste multiple job advertisements below. QWERTY will separate, structure and prepare them for review before publication.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded mb-6 border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700">Raw Advertisements</span>
          <span className="text-xs text-slate-500">
            {rawText.length.toLocaleString()} characters
          </span>
        </div>
        <textarea
          className="flex-1 w-full p-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#0B3D2E] border-none"
          placeholder="Paste content from WhatsApp, Telegram, email, LinkedIn, websites, or plain text documents..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={handleClear}
          disabled={loading || !rawText}
          className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Clear
        </button>
        <button
          onClick={handleAnalyse}
          disabled={loading || !rawText.trim()}
          className="px-4 py-2 bg-[#0B3D2E] text-white rounded hover:bg-[#0a2e22] disabled:opacity-50 min-w-[120px] flex justify-center items-center"
        >
          {loading ? 'Processing...' : 'Analyse Jobs'}
        </button>
      </div>
    </div>
  );
}
