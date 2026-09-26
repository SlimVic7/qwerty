import { getAdminClient } from '../../db/supabase.js';
import { JobExtractionItem } from './types.js';

export async function detectDuplicate(item: JobExtractionItem): Promise<{ isDuplicate: boolean; jobId: string | null; status: 'strong' | 'possible' | 'none' }> {
  const supabase = getAdminClient();
  const { fields } = item;
  
  if (fields.application_url) {
    const { data } = await supabase.from('jobs').select('id').eq('application_url', fields.application_url).limit(1);
    if (data && data.length > 0) return { isDuplicate: true, jobId: data[0].id, status: 'strong' };
  }
  
  if (fields.application_email) {
    const { data } = await supabase.from('jobs').select('id').eq('application_email', fields.application_email).limit(1);
    if (data && data.length > 0) return { isDuplicate: true, jobId: data[0].id, status: 'strong' };
  }
  
  if (fields.company_name && fields.title) {
    const { data } = await supabase.from('jobs').select('id').ilike('company_name', fields.company_name).ilike('title', fields.title).limit(1);
    if (data && data.length > 0) return { isDuplicate: true, jobId: data[0].id, status: 'possible' };
  }

  return { isDuplicate: false, jobId: null, status: 'none' };
}
