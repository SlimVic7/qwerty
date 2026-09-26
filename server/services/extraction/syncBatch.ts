import { getAdminClient } from '../../db/supabase.js';

export async function syncBatchStatus(batchId: string) {
    const supabase = getAdminClient();
    
    const { data: items, error: itemsError } = await supabase
        .from('job_import_items')
        .select('review_status')
        .eq('batch_id', batchId);
        
    if (itemsError) throw itemsError;

    let readyCount = 0;
    let reviewCount = 0;
    let duplicateCount = 0;
    let terminalCount = 0;
    
    for (const item of items) {
        if (item.review_status === 'ready') readyCount++;
        else if (item.review_status === 'needs_review' || item.review_status === 'pending') reviewCount++;
        else if (item.review_status === 'duplicate') duplicateCount++;
        
        if (['imported', 'rejected', 'duplicate'].includes(item.review_status)) {
            terminalCount++;
        }
    }

    const isCompleted = terminalCount === items.length && items.length > 0;
    
    await supabase
        .from('job_import_batches')
        .update({
            ready_count: readyCount,
            review_count: reviewCount,
            duplicate_count: duplicateCount,
            status: isCompleted ? 'completed' : 'review'
        })
        .eq('id', batchId);
}
