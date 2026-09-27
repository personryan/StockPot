import { AuthChangeEvent, AuthError, Session } from '@supabase/supabase-js';
import { vi } from 'vitest';
import { AuthClient } from './supabase-auth';

export const testSession: Session = {
  access_token: 'test-access-token', refresh_token: 'test-refresh-token',
  expires_in: 3600, expires_at: 4000000000, token_type: 'bearer',
  user: { id: '1c467b92-e7df-46c3-93cc-412c8bd5d900', email: 'test@example.com',
    aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
};

export function mockAuth(initial: Session | null = null) {
  let session = initial;
  let callback: (event: AuthChangeEvent, session: Session | null) => void = () => {};
  const emit = (event: AuthChangeEvent, value: Session | null) => { session = value; callback(event, value); };
  const unsubscribe = vi.fn();
  const methods = {
    getSession: vi.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: vi.fn((fn: typeof callback) => { callback = fn; return { data: { subscription: { unsubscribe } } }; }),
    signInWithPassword: vi.fn(async () => { emit('SIGNED_IN', testSession); return { data: { session: testSession as Session | null }, error: null as AuthError | null }; }),
    signUp: vi.fn(async () => ({ data: { session: null as Session | null }, error: null as AuthError | null })),
    signOut: vi.fn(async () => { emit('SIGNED_OUT', null); return { error: null }; }),
    exchangeCodeForSession: vi.fn(async () => { emit('SIGNED_IN', testSession); return { data: { session: testSession }, error: null }; }),
  };
  return { methods, client: methods as unknown as AuthClient, emit, unsubscribe };
}
