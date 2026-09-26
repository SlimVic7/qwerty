const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/JobOpsEditor.tsx', 'utf8');

// Replace alerts and confirms
code = code.replace(
  "const [error, setError] = useState('');",
  "const [error, setError] = useState('');\n  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);\n  const [confirmAction, setConfirmAction] = useState<'publish' | 'unpublish' | 'close' | 'archive' | 'feature' | 'unfeature' | null>(null);\n\n  const showNotification = (message: string, type: 'success' | 'error') => {\n    setNotification({ message, type });\n    setTimeout(() => setNotification(null), 5000);\n  };"
);

code = code.replace(
  "if (id) {\n      loadJob(id);\n    }",
  "if (id === 'undefined') {\n      setError('Unable to determine this job record. Please return to the jobs list and try again.');\n      setLoading(false);\n    } else if (id) {\n      loadJob(id);\n    }"
);

code = code.replace(
  "alert('Saved successfully');",
  "showNotification('Saved successfully', 'success');"
);
code = code.replace(
  "alert('Created successfully');",
  "showNotification('Created successfully', 'success');"
);
code = code.replace(
  "alert(err.message || 'Failed to save');",
  "showNotification(err.message || 'Failed to save', 'error');"
);

code = code.replace(
  "const handleLifecycle = async (action: 'publish' | 'unpublish' | 'close' | 'archive' | 'feature' | 'unfeature') => {\n    if (!isAdmin) return;\n    if (!confirm(`Are you sure you want to ${action} this job?`)) return;\n        \n    setSaving(true);\n    try {",
  "const requestLifecycleAction = (action: 'publish' | 'unpublish' | 'close' | 'archive' | 'feature' | 'unfeature') => {\n    if (!isAdmin) return;\n    if (!job.id || job.id === 'undefined') {\n      showNotification('Unable to determine this job record. Please return to the jobs list and try again.', 'error');\n      return;\n    }\n    setConfirmAction(action);\n  };\n\n  const executeLifecycle = async () => {\n    if (!confirmAction || !job.id) return;\n    const action = confirmAction;\n    setConfirmAction(null);\n    setSaving(true);\n    try {"
);

code = code.replace(
  "alert(`Job successfully ${action}ed`);",
  "showNotification(`Job successfully ${action}ed`, 'success');"
);
code = code.replace(
  "alert(`Unable to ${action} this job. Please try again.`);",
  "showNotification(`Unable to ${action} this job. Please try again.`, 'error');"
);

code = code.replace(
  "if (error) return <div className=\"p-8 text-red-600\">Error: {error}</div>;",
  "if (error) return <div className=\"p-8 text-red-600\">Error: {error}</div>;"
);

// Replace handleLifecycle calls with requestLifecycleAction in the JSX
code = code.replace(/onClick=\{\(\) => handleLifecycle\(/g, "onClick={() => requestLifecycleAction(");

// Append the modal JSX at the end of the return
code = code.replace(
  "    </div>\n  );\n}",
  `    </div>
      {notification && (
        <div className={\`fixed bottom-4 right-4 p-4 rounded shadow-lg text-white font-medium z-50 \${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}\`}>
          {notification.message}
        </div>
      )}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 capitalize">{confirmAction} Job?</h3>
            <p className="text-slate-600 mb-6">
              {confirmAction === 'archive' && 'This job will no longer be available for editing or publishing.'}
              {confirmAction === 'publish' && 'This job will be visible to public users.'}
              {confirmAction === 'unpublish' && 'This job will be moved back to draft and hidden from the public.'}
              {confirmAction === 'close' && 'This job will be closed and no longer accept applications.'}
              {(confirmAction === 'feature' || confirmAction === 'unfeature') && \`Are you sure you want to \${confirmAction} this job?\`}
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmAction(null)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded">
                Cancel
              </button>
              <button type="button" onClick={executeLifecycle} className="px-4 py-2 font-medium bg-blue-600 hover:bg-blue-700 text-white rounded capitalize">
                {confirmAction} Job
              </button>
            </div>
          </div>
        </div>
      )}
  );
}`
);

fs.writeFileSync('src/features/jobs/ops/JobOpsEditor.tsx', code);
