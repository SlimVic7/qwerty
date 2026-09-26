import { authFetch } from '../../../../lib/authFetch.js';

export interface JobImportBatch {
  id: string;
  created_by: string;
  source_type: string;
  raw_text: string;
  status: 'received' | 'processing' | 'review' | 'completed' | 'failed';
  total_detected: number;
  ready_count: number;
  review_count: number;
  duplicate_count: number;
  failed_count: number;
  created_at: string;
}

export interface JobImportItem {
  id: string;
  batch_id: string;
  sequence_number: number;
  raw_text: string;
  extracted_data: Record<string, any>;
  normalized_data: Record<string, any>;
  validation_issues: string[];
  confidence_score?: number;
  duplicate_of_job_id?: string;
  review_status: 'pending' | 'ready' | 'needs_review' | 'duplicate' | 'rejected' | 'approved' | 'imported';
  created_job_id?: string;
}

export const jobImportsService = {
  async getBatches(): Promise<JobImportBatch[]> {
    return authFetch('/api/ops/imports/batches');
  },

  async createBatch(rawText: string): Promise<JobImportBatch> {
    return authFetch('/api/ops/imports/batches', {
      method: 'POST',
      body: JSON.stringify({ rawText })
    });
  },

  async getBatchDetails(batchId: string): Promise<{ batch: JobImportBatch, items: JobImportItem[] }> {
    return authFetch(`/api/ops/imports/batches/${batchId}`);
  },

  async updateItem(itemId: string, updates: Partial<JobImportItem>): Promise<JobImportItem> {
    return authFetch(`/api/ops/imports/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async importItems(itemIds: string[]): Promise<any[]> {
    return authFetch(`/api/ops/imports/import`, {
      method: 'POST',
      body: JSON.stringify({ itemIds })
    });
  }
};
