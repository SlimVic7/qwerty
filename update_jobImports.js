import fs from 'fs';

let content = fs.readFileSync('server/routes/jobImports.ts', 'utf-8');

// Import syncBatchStatus
content = content.replace(
    "import { detectDuplicate } from '../services/extraction/duplicateDetection.js';",
    "import { detectDuplicate } from '../services/extraction/duplicateDetection.js';\nimport { syncBatchStatus } from '../services/extraction/syncBatch.js';"
);

// Replace PATCH /items/:id
const patchRoute = `jobImportsRouter.patch('/items/:id', requireAuth, requireRole(['editor', 'admin', 'super_admin']), async (req, res) => {
  try {
    const supabase = getAdminClient();
    
    // 1. Fetch current item
    const { data: item, error: fetchError } = await supabase
      .from('job_import_items')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (fetchError || !item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    if (item.review_status === 'imported') {
      return res.status(400).json({ message: 'Cannot edit an imported item' });
    }

    let updates: any = {};
    let auditAction = '';
    
    // Check if normalized_data is edited
    if (req.body.normalized_data) {
      updates.normalized_data = { ...item.normalized_data, ...req.body.normalized_data };
      
      // Re-validate
      const { issues, isReady } = validateExtraction({ 
        fields: updates.normalized_data, 
        confidence: item.confidence_score || 1, 
        warnings: [] 
      });
      
      updates.validation_issues = issues;
      
      // If previously approved, revoke approval
      if (item.review_status === 'approved') {
        updates.review_status = isReady ? 'ready' : 'needs_review';
        auditAction = 'edited';
      } else if (item.review_status !== 'rejected' && item.review_status !== 'duplicate') {
        updates.review_status = isReady ? 'ready' : 'needs_review';
        auditAction = 'edited';
      } else {
        auditAction = 'edited';
      }
    }
    
    // Direct status update (Approve, Reject, Duplicate, Not Duplicate)
    if (req.body.review_status) {
      const newStatus = req.body.review_status;
      
      if (newStatus === 'approved') {
        // Must validate
        const dataToValidate = updates.normalized_data || item.normalized_data;
        const { issues } = validateExtraction({ 
          fields: dataToValidate, 
          confidence: item.confidence_score || 1, 
          warnings: [] 
        });
        
        if (issues.length > 0) {
          return res.status(400).json({ message: 'VALIDATION_FAILED', issues });
        }
        
        updates.review_status = 'approved';
        updates.reviewed_by = req.user!.id;
        updates.reviewed_at = new Date().toISOString();
        auditAction = 'approved';
      } else if (newStatus === 'rejected') {
        updates.review_status = 'rejected';
        auditAction = 'rejected';
      } else if (newStatus === 'duplicate') {
        updates.review_status = 'duplicate';
        auditAction = 'marked_duplicate';
      } else if (newStatus === 'needs_review' && item.review_status === 'duplicate') {
        // "Not Duplicate"
        updates.review_status = 'needs_review';
        updates.duplicate_of_job_id = null;
        auditAction = 'unmarked_duplicate';
        // Let's re-validate
        const { isReady } = validateExtraction({ 
            fields: item.normalized_data, 
            confidence: item.confidence_score || 1, 
            warnings: [] 
        });
        updates.review_status = isReady ? 'ready' : 'needs_review';
      }
    }
    
    if (Object.keys(updates).length === 0) {
        return res.json(item);
    }
    
    updates.updated_at = new Date().toISOString();

    const { data: updatedItem, error } = await supabase
      .from('job_import_items')
      .update(updates)
      .eq('id', item.id)
      .select()
      .single();
      
    if (error) throw error;
    
    if (auditAction) {
      await supabase.from('job_import_audit_log').insert({
          item_id: item.id,
          batch_id: item.batch_id,
          actor_id: req.user!.id,
          action: auditAction
      });
    }
    
    await syncBatchStatus(item.batch_id);

    res.json(updatedItem);
  } catch (error: any) {
    console.error("PATCH error:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});`;

const regex = /jobImportsRouter\.patch\('\/items\/:id'[\s\S]*?res\.status\(500\)\.json\(\{ message: 'Internal server error' \}\);\s*\}\s*\}\);/g;
content = content.replace(regex, patchRoute);

// Add Import Route
const importRoute = `
// POST /import
jobImportsRouter.post('/import', requireAuth, requireRole(['editor', 'admin', 'super_admin']), async (req, res) => {
  const { itemIds } = req.body;
  
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ message: 'itemIds array is required' });
  }
  
  const supabase = getAdminClient();
  const results = [];
  
  for (const itemId of itemIds) {
    try {
      const { data, error } = await supabase.rpc('ops_import_job_item', {
        p_item_id: itemId,
        p_actor_id: req.user!.id
      });
      
      if (error) {
        results.push({ itemId, status: 'failed', reason: error.message });
      } else {
        results.push({ itemId, status: data.status, jobId: data.job_id });
      }
    } catch (err: any) {
      results.push({ itemId, status: 'failed', reason: err.message });
    }
  }
  
  // We sync batch status based on the first item's batch id, or we could fetch it.
  // Let's just fetch the batch ID for the first item and sync it.
  try {
      const { data: firstItem } = await supabase.from('job_import_items').select('batch_id').eq('id', itemIds[0]).single();
      if (firstItem) {
          await syncBatchStatus(firstItem.batch_id);
      }
  } catch(e) {}
  
  res.json(results);
});
`;

content += importRoute;

fs.writeFileSync('server/routes/jobImports.ts', content);
