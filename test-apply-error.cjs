const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const userId = users.users.find(u => u.email === 'talk2mobbi@gmail.com')?.id || users.users[0]?.id;
  
  if (!userId) {
    console.log("No user found");
    return;
  }
  
  const { data: cv } = await supabase.from('candidate_cv_versions').select('id').eq('user_id', userId).limit(1).single();
  let cvId = cv?.id;
  if (!cvId) {
    const { data: newCv } = await supabase.from('candidate_cv_versions').insert({
      user_id: userId,
      storage_path: 'test',
      original_filename: 'test.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 100,
      version_number: 1
    }).select().single();
    cvId = newCv.id;
  }
  
  const { data: parse, error: insertError } = await supabase.from('candidate_cv_parses').insert({
    cv_version_id: cvId,
    user_id: userId,
    status: 'needs_review',
    extracted_data: { display_name: 'AI Name' },
    completed_at: new Date().toISOString()
  }).select().single();
  
  if (insertError) {
    console.error("Insert error:", insertError);
    return;
  }
  
  console.log("Inserted parse:", parse.id);
  
  const { error: updateError } = await supabase.from('candidate_cv_parses').update({
    status: 'completed',
    applied_at: new Date().toISOString(),
    reviewed_at: new Date().toISOString(),
    reviewed_data: { display_name: 'Reviewed Name' }
  }).eq('id', parse.id);
  
  if (updateError) {
    console.error("Update error:", updateError);
  } else {
    console.log("Update success!");
  }
}
run();
