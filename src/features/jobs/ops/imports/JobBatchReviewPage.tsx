import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobImportsService, JobImportBatch, JobImportItem } from './jobImports.service.js';
import { ArrowLeft, Check, X, AlertCircle, Edit2, ShieldAlert, UploadCloud, FileText } from 'lucide-react';

export function JobBatchReviewPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<JobImportBatch | null>(null);
  const [items, setItems] = useState<JobImportItem[]>([]);
  const [activeItem, setActiveItem] = useState<JobImportItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const isValidUUID = (id: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  };

  const loadBatch = async () => {
    if (!batchId || !isValidUUID(batchId)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await jobImportsService.getBatchDetails(batchId);
      setBatch(data.batch);
      setItems(data.items);
      if (data.items.length > 0) {
        setActiveItem(data.items[0]);
      }
    } catch (err: any) {
      setError('Unable to load this import batch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!batchId) {
      setError('Unable to determine this import batch.');
      setLoading(false);
      return;
    }

    if (!isValidUUID(batchId)) {
      setError('Invalid batch ID format.');
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await jobImportsService.getBatchDetails(batchId);
        
        if (active) {
          setBatch(data.batch);
          setItems(data.items);
          if (data.items.length > 0) {
            setActiveItem(data.items[0]);
          }
        }
      } catch (err) {
        if (active) {
          setError('Unable to load this import batch. Please try again.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [batchId]);

  const handleUpdateItemStatus = async (itemId: string, status: string) => {
    try {
      const updatedItem = await jobImportsService.updateItem(itemId, { review_status: status as any });
      setItems(items.map(i => i.id === itemId ? updatedItem : i));
      if (activeItem?.id === itemId) setActiveItem(updatedItem);
      
      // We should technically reload the batch to update counters, but we can do a quick reload
      const data = await jobImportsService.getBatchDetails(batchId!);
      setBatch(data.batch);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleSaveEdits = async () => {
    if (!activeItem) return;
    try {
      const updatedItem = await jobImportsService.updateItem(activeItem.id, { normalized_data: editForm });
      setItems(items.map(i => i.id === activeItem.id ? updatedItem : i));
      setActiveItem(updatedItem);
      setIsEditing(false);
      
      const data = await jobImportsService.getBatchDetails(batchId!);
      setBatch(data.batch);
    } catch (err: any) {
      alert(err.message || 'Failed to save edits');
    }
  };

  const handleImportSelected = async () => {
    const idsToImport = Array.from(selectedIds);
    if (idsToImport.length === 0) return;
    
    try {
      const results = await jobImportsService.importItems(idsToImport as string[]);
      // Reload everything
      const data = await jobImportsService.getBatchDetails(batchId!);
      setBatch(data.batch);
      setItems(data.items);
      if (activeItem) {
          setActiveItem(data.items.find(i => i.id === activeItem.id) || null);
      }
      setSelectedIds(new Set());
      
      const failures = results.filter(r => r.status === 'failed');
      if (failures.length > 0) {
          alert(`Imported some items, but ${failures.length} failed.`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to import items');
    }
  };

  const toggleSelection = (itemId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = new Set(selectedIds);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      setSelectedIds(next);
  };

  const renderBadge = (status: string) => {
    switch (status) {
      case 'needs_review': return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-200">Needs Review</span>;
      case 'ready': return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">Ready</span>;
      case 'duplicate': return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full border border-orange-200">Duplicate</span>;
      case 'rejected': return <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full border border-red-200">Rejected</span>;
      case 'approved': return <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">Approved</span>;
      case 'imported': return <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full border border-purple-200">Imported</span>;
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-xs rounded-full">{status}</span>;
    }
  };

  const startEditing = () => {
      if (!activeItem) return;
      setEditForm(activeItem.normalized_data || {});
      setIsEditing(true);
  };

  const editableFields = [
      { key: 'title', label: 'Job Title' },
      { key: 'company_name', label: 'Company' },
      { key: 'location_text', label: 'Location' },
      { key: 'workplace_type', label: 'Workplace' },
      { key: 'employment_type', label: 'Employment' },
      { key: 'salary_min', label: 'Min Salary', type: 'number' },
      { key: 'salary_max', label: 'Max Salary', type: 'number' },
      { key: 'salary_currency', label: 'Currency' },
      { key: 'application_url', label: 'App URL' },
      { key: 'application_email', label: 'App Email' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'requirements', label: 'Requirements', type: 'textarea' }
  ];

  if (loading) return <div className="p-8">Loading batch details...</div>;
  if (error || !batch) return (
    <div className="p-8">
      <div className="text-red-600 mb-4">{error || 'Batch not found'}</div>
      <button onClick={loadBatch} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700">Retry</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 border-b border-slate-200 bg-white shadow-sm flex items-center gap-4 shrink-0">
        <Link to="/0ps26/jobs/imports" className="text-slate-500 hover:text-slate-900">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Review Batch: {batch.id.substring(0, 8)}...</h1>
        <div className="ml-auto flex gap-2">
          <div className="px-3 py-1 bg-slate-100 rounded text-sm font-medium">Total: {batch.total_detected}</div>
          <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded text-sm font-medium">Duplicates: {batch.duplicate_count}</div>
          <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">Needs Review: {batch.review_count}</div>
          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">Ready: {batch.ready_count}</div>
          <button 
             onClick={handleImportSelected}
             disabled={selectedIds.size === 0}
             className="px-3 py-1 bg-indigo-600 text-white rounded text-sm font-medium disabled:opacity-50 flex items-center gap-1">
             <UploadCloud size={16} /> Import Selected ({selectedIds.size})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left List */}
        <div className="w-1/3 border-r border-slate-200 bg-white overflow-y-auto">
          {items.length === 0 && <div className="p-4 text-slate-500 text-sm">No jobs extracted from this batch.</div>}
          {items.map(item => {
            const title = item.normalized_data?.title || item.extracted_data?.fields?.title || 'Untitled';
            const company = item.normalized_data?.company_name || item.extracted_data?.fields?.company_name || 'No company specified';
            const isApproved = item.review_status === 'approved';
            
            return (
            <div
              key={item.id}
              onClick={() => {
                  setActiveItem(item);
                  setIsEditing(false);
              }}
              className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition-colors ${activeItem?.id === item.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 overflow-hidden">
                    {isApproved && (
                        <input 
                            type="checkbox" 
                            checked={selectedIds.has(item.id)} 
                            onChange={(e) => toggleSelection(item.id, e as any)} 
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                    <span className="font-medium truncate pr-2">{title}</span>
                </div>
                {renderBadge(item.review_status)}
              </div>
              <div className="text-sm text-slate-600 truncate ml={isApproved ? 6 : 0}">{company}</div>
              <div className="mt-2 flex gap-3 text-xs">
                 {item.validation_issues?.length > 0 && (
                  <div className="flex items-center text-amber-600 gap-1">
                    <AlertCircle size={12} />
                    <span>{item.validation_issues.length} issue(s)</span>
                  </div>
                 )}
              </div>
            </div>
            );
          })}
        </div>

        {/* Right Review Panel */}
        <div className="flex-1 bg-slate-50 overflow-y-auto">
          {activeItem ? (
            <div className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-3">
                    Review Item #{activeItem.sequence_number}
                    {renderBadge(activeItem.review_status)}
                </h2>
                
                <div className="flex gap-2">
                  {activeItem.review_status === 'imported' && activeItem.created_job_id ? (
                      <Link to={`/0ps26/jobs/${activeItem.created_job_id}/edit`} className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-800 rounded hover:bg-slate-300 font-medium">
                          <FileText size={16} /> View Draft
                      </Link>
                  ) : (
                      <>
                        {activeItem.review_status === 'duplicate' && (
                           <button onClick={() => handleUpdateItemStatus(activeItem.id, 'needs_review')} className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 font-medium text-sm">
                             Not Duplicate
                           </button>
                        )}
                        {activeItem.review_status !== 'duplicate' && activeItem.review_status !== 'rejected' && (
                           <button onClick={() => handleUpdateItemStatus(activeItem.id, 'duplicate')} className="flex items-center gap-1 px-3 py-1.5 border border-orange-200 text-orange-600 rounded hover:bg-orange-50 font-medium text-sm">
                             Mark Duplicate
                           </button>
                        )}
                        <button onClick={() => handleUpdateItemStatus(activeItem.id, 'rejected')} className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50 font-medium text-sm">
                          <X size={16} /> Reject
                        </button>
                        <button onClick={() => handleUpdateItemStatus(activeItem.id, 'approved')} className="flex items-center gap-1 px-3 py-1.5 bg-[#0B3D2E] text-white rounded hover:bg-[#0a2e22] font-medium text-sm">
                          <Check size={16} /> Approve
                        </button>
                      </>
                  )}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                {/* Original Text */}
                <div className="flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-medium text-sm text-slate-700">
                    Original Advert Text
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-slate-800 bg-slate-50">
                    {activeItem.raw_text}
                  </div>
                </div>

                {/* Extracted Data */}
                <div className="flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                  <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 font-medium text-sm text-indigo-900 flex justify-between items-center">
                    Structured Extraction
                    {activeItem.review_status !== 'imported' && (
                        !isEditing ? (
                            <button onClick={startEditing} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs px-2 py-1 bg-white rounded shadow-sm border border-indigo-200">
                              <Edit2 size={12} /> Edit Fields
                            </button>
                        ) : (
                            <button onClick={handleSaveEdits} className="text-white hover:bg-indigo-700 bg-indigo-600 flex items-center gap-1 text-xs px-2 py-1 rounded shadow-sm">
                              <Check size={12} /> Save Corrections
                            </button>
                        )
                    )}
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto">
                    {activeItem.review_status === 'duplicate' && (
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-orange-900 text-sm flex gap-2">
                        <ShieldAlert className="shrink-0 text-orange-500" size={18} />
                        <div>
                          <strong>Possible Duplicate Detected:</strong> 
                          <p className="mt-1 text-orange-800">Matches existing job ID: {activeItem.duplicate_of_job_id}</p>
                        </div>
                      </div>
                    )}

                    {activeItem.validation_issues?.length > 0 && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                        <strong className="flex items-center gap-1"><AlertCircle size={16}/> Validation Flags:</strong>
                        <ul className="list-disc ml-6 mt-1">
                          {activeItem.validation_issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      {editableFields.map(field => {
                          const val = isEditing ? editForm[field.key] : activeItem.normalized_data?.[field.key];
                          if (!isEditing && !val) return null;
                          
                          return (
                              <div key={field.key} className="border-b border-slate-100 pb-3">
                                  <div className="text-xs font-semibold text-slate-500 mb-1">{field.label}</div>
                                  {isEditing ? (
                                      field.type === 'textarea' ? (
                                          <textarea 
                                              value={val || ''}
                                              onChange={(e) => setEditForm({...editForm, [field.key]: e.target.value})}
                                              className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                              rows={4}
                                          />
                                      ) : (
                                          <input 
                                              type={field.type === 'number' ? 'number' : 'text'}
                                              value={val || ''}
                                              onChange={(e) => setEditForm({...editForm, [field.key]: e.target.value})}
                                              className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                          />
                                      )
                                  ) : (
                                      <div className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{val}</div>
                                  )}
                              </div>
                          );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              Select an item from the left to review its extraction.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
