import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SUPABASE_AUTH } from './supabase-auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = inject(SUPABASE_AUTH);
  private readonly sessionState = signal<Session | null>(null);
  private revision = 0;
  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly initialized = signal(false);
  readonly configured = this.client !== null;
  readonly ready: Promise<void>;

  constructor() {
    if (this.client) {
      const { data } = this.client.onAuthStateChange((_event, session) => {
        // Keep callbacks synchronous: awaiting SDK calls here can deadlock its session lock.
        this.revision++;
        this.sessionState.set(session);
      });
      inject(DestroyRef).onDestroy(() => data.subscription.unsubscribe());
    }
    this.ready = this.restore();
  }

  private async restore() {
    const revision = this.revision;
    try {
      const result = await this.client?.getSession();
      if (revision === this.revision) this.sessionState.set(result?.error ? null : result?.data.session ?? null);
    } catch { if (revision === this.revision) this.sessionState.set(null); }
    finally { this.initialized.set(true); }
  }

  async accessToken(): Promise<string | null> {
    await this.ready;
    if (!this.client) return null;
    // getSession refreshes an expired session using the SDK's refresh-token lock.
    try {
      const { data, error } = await this.client.getSession();
      if (error) return null;
      return data.session?.access_token ?? null;
    } catch { return null; }
  }

  async login(email: string, password: string): Promise<string | null> {
    await this.ready;
    if (!this.client) return 'Authentication is not configured.';
    try {
      const { data, error } = await this.client.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session) return 'Unable to sign in. Check your credentials and confirm your email.';
      this.sessionState.set(data.session);
      return null;
    } catch { return 'Unable to reach sign-in. Please try again.'; }
  }

  async register(email: string, password: string): Promise<'signed-in' | 'confirmation' | string> {
    await this.ready;
    if (!this.client) return 'Authentication is not configured.';
    try {
      const { data, error } = await this.client.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) return 'Unable to register. Check your details and password requirements, then try again.';
      if (!data.session) return 'confirmation';
      this.sessionState.set(data.session);
      return 'signed-in';
    } catch { return 'Unable to reach registration. Please try again.'; }
  }

  async confirm(code: string): Promise<boolean> {
    await this.ready;
    if (!this.client) return false;
    try {
      const { data, error } = await this.client.exchangeCodeForSession(code);
      if (error || !data.session) return false;
      this.sessionState.set(data.session);
      return true;
    } catch { return false; }
  }

  async logout(): Promise<string | null> {
    await this.ready;
    if (!this.client) return null;
    try {
      const { error } = await this.client.signOut({ scope: 'local' });
      if (error) return 'Unable to sign out. Please try again.';
      this.sessionState.set(null);
      return null;
    } catch { return 'Unable to sign out. Please try again.'; }
  }
}
