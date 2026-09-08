import { json } from '../_lib/util.js';

export async function onRequestGet({ data, env }) {
  return json({
    email: data.user?.email || null,
    configured: { supabase: !!env.SUPABASE_SERVICE_KEY, github: !!env.GITHUB_TOKEN, repo: env.GITHUB_REPO || 'xiabarun001/um-housing' },
  });
}
