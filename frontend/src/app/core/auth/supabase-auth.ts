import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// Expose only Auth to application code. Application data belongs to the Go API.
export type AuthClient = SupabaseClient['auth'];
export const SUPABASE_AUTH = new InjectionToken<AuthClient | null>('Supabase Auth', {
  providedIn: 'root',
  factory: () => {
    if (!environment.supabasePublishableKey.startsWith('sb_publishable_') ||
        environment.supabaseUrl.includes('YOUR_')) return null;
    try {
      return createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce', detectSessionInUrl: false },
      }).auth;
    } catch { return null; }
  },
});
