import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

interface Thread {
  id: string;
  title: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system_event';
  content: string;
  grounding_metadata?: {
    grounding_sources?: string[];
    model?: string;
  };
  created_at: string;
}

const STARTER_PROMPTS = [
  "What should I focus on next for my career role?",
  "Explain my Development Focus skills.",
  "Which learning resources should I start with?",
  "Help me understand my skill roadmap.",
  "What evidence does QWERTY currently have for my profile?"
];

export const CandidateCareerCoachPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const threadIdParam = searchParams.get('threadId');

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(threadIdParam);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  
  // Async job & 10s UX state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'queued' | 'processing' | 'slow' | 'completed' | 'failed'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load candidate's threads on mount
  useEffect(() => {
    fetchThreads();
  }, []);

  // Sync active thread with URL param or select first thread
  useEffect(() => {
    if (threadIdParam) {
      setActiveThreadId(threadIdParam);
    } else if (threads.length > 0 && !activeThreadId) {
      setActiveThreadId(threads[0].id);
    }
  }, [threadIdParam, threads]);

  // Load message history when active thread changes
  useEffect(() => {
    if (activeThreadId) {
      fetchThreadMessages(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, jobStatus]);

  // Timer for 10-second UX threshold when job is active
  useEffect(() => {
    let timer: any = null;
    if (activeJobId && (jobStatus === 'queued' || jobStatus === 'processing')) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next >= 10) {
            setJobStatus('slow');
          }
          return next;
        });
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeJobId, jobStatus]);

  // Polling loop for active job status (every 3 seconds)
  useEffect(() => {
    let pollInterval: any = null;
    if (activeJobId && jobStatus !== 'completed' && jobStatus !== 'failed') {
      pollInterval = setInterval(async () => {
        await checkJobStatus(activeJobId);
      }, 3000);
    }
    return () => clearInterval(pollInterval);
  }, [activeJobId, jobStatus]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/candidate/career/coach/threads');
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch (err) {
      console.error('Failed to fetch coach threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadMessages = async (threadId: string) => {
    try {
      const res = await fetch(`/api/candidate/career/coach/threads/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch thread messages:', err);
    }
  };

  const handleStartNewThread = async () => {
    try {
      const res = await fetch('/api/candidate/career/coach/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Career Coaching Session' })
      });
      if (res.ok) {
        const data = await res.json();
        setThreads((prev) => [data.thread, ...prev]);
        setActiveThreadId(data.thread.id);
        setSearchParams({ threadId: data.thread.id });
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to create new conversation');
    }
  };

  const checkJobStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/candidate/career/coach/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'completed') {
          setJobStatus('completed');
          setActiveJobId(null);
          if (activeThreadId) {
            await fetchThreadMessages(activeThreadId);
          }
        } else if (data.status === 'failed_permanent' || data.status === 'failed_retryable') {
          setJobStatus('failed');
          setActiveJobId(null);
          setError("We couldn't finish processing this request yet. Please try again.");
        }
      }
    } catch (err) {
      console.error('Error checking coach job status:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    setError(null);
    setInputQuery('');

    let currentThreadId = activeThreadId;

    // Create thread if none exists
    if (!currentThreadId) {
      try {
        const createRes = await fetch('/api/candidate/career/coach/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: query.slice(0, 30) + '...' })
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          currentThreadId = createData.thread.id;
          setActiveThreadId(currentThreadId);
          setThreads((prev) => [createData.thread, ...prev]);
          setSearchParams({ threadId: currentThreadId! });
        }
      } catch (err) {
        setError('Failed to start thread');
        return;
      }
    }

    if (!currentThreadId) return;

    // Optimistically add user message to local state
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: query,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Submit question to async API
    setJobStatus('queued');
    try {
      const res = await fetch(`/api/candidate/career/coach/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: query })
      });

      if (res.status === 202) {
        const data = await res.json();
        setActiveJobId(data.job_id);
        setJobStatus('processing');
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to submit message');
        setJobStatus('failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      setJobStatus('failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Intro Header & Disclaimer */}
      <div className="bg-emerald-900 text-white rounded-xl p-6 shadow-sm border border-emerald-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-800 rounded-lg text-emerald-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">AI Career Coach</h1>
        </div>
        <p className="text-emerald-100 text-sm sm:text-base leading-relaxed mb-4">
          QWERTY Career Coach uses your QWERTY profile, approved CV evidence, and Career Hub information to provide grounded career-development guidance.
        </p>
        <div className="bg-emerald-950/60 p-3 rounded-lg border border-emerald-800/80 text-xs text-emerald-200">
          <span className="font-semibold text-emerald-300">Grounding Disclaimer:</span> Career Coach guidance is informational and based strictly on the evidence available to QWERTY. It does not guarantee employment, salary levels, or professional outcomes.
        </div>
      </div>

      {/* Main Conversation Container */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[500px]">
        {/* Sidebar: Thread List */}
        <div className="md:col-span-1 bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
          <div>
            <button
              onClick={handleStartNewThread}
              className="w-full py-2.5 px-3 bg-[#0B3D2E] hover:bg-[#082e22] text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Conversation
            </button>

            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Past Sessions</h3>
            {loading && <p className="text-xs text-slate-400">Loading sessions...</p>}
            {!loading && threads.length === 0 && (
              <p className="text-xs text-slate-400 italic">No previous sessions yet.</p>
            )}

            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveThreadId(t.id);
                    setSearchParams({ threadId: t.id });
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition-colors truncate block ${
                    activeThreadId === t.id
                      ? 'bg-emerald-50 text-[#0B3D2E] font-semibold border border-emerald-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Workspace */}
        <div className="md:col-span-3 bg-white rounded-xl border border-slate-200 flex flex-col h-[600px]">
          {/* Message History */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-[#0B3D2E] rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  Q
                </div>
                <h3 className="text-base font-semibold text-slate-900">How can I assist your career development today?</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Select a starter prompt below or ask any question about your skill roadmap, focus areas, or learning resources.
                </p>

                {/* Starter Prompts */}
                <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-xl mx-auto">
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-[#0B3D2E] border border-slate-200 hover:border-emerald-300 px-3 py-2 rounded-lg transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 space-y-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-[#0B3D2E] text-white rounded-tr-none'
                      : 'bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* Grounding Transparency Badge */}
                  {msg.role === 'assistant' && msg.grounding_metadata?.grounding_sources && (
                    <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 space-y-1">
                      <span className="font-semibold text-slate-600 block">Based on:</span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {msg.grounding_metadata.grounding_sources.map((src, i) => (
                          <li key={i}>{src}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Async Job Status Indicator & 10-Second UX */}
            {jobStatus !== 'idle' && jobStatus !== 'completed' && jobStatus !== 'failed' && (
              <div className="flex justify-start">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 max-w-[85%] space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                    {jobStatus === 'queued' && <span>Request received</span>}
                    {jobStatus === 'processing' && <span>Processing your request… ({elapsedSeconds}s)</span>}
                    {jobStatus === 'slow' && (
                      <span className="font-semibold text-amber-950">
                        This is taking a little longer than usual. You can continue using QWERTY — your result will appear here when ready.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about your development roadmap or career skills..."
                disabled={jobStatus === 'queued' || jobStatus === 'processing'}
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D2E] disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || jobStatus === 'queued' || jobStatus === 'processing'}
                className="px-5 py-2.5 bg-[#0B3D2E] hover:bg-[#082e22] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
