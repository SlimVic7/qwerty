import fs from 'fs';
let content = fs.readFileSync('server/db/supabase.ts', 'utf-8');

const additional = `
export const getAuthClient = (authHeader: string) => {
  return createClient(env.SUPABASE_URL || '', process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
};
`;

if (!content.includes('getAuthClient')) {
  fs.writeFileSync('server/db/supabase.ts', content + additional);
}
