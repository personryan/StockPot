import { TestBed } from '@angular/core/testing';
import { AuthError } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { SUPABASE_AUTH } from './supabase-auth';
import { mockAuth, testSession } from './auth.testing';

describe('AuthService', () => {
  let mock: ReturnType<typeof mockAuth>;
  let auth: AuthService;
  beforeEach(() => {
    mock = mockAuth();
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_AUTH, useValue: mock.client }] });
    auth = TestBed.inject(AuthService);
  });

  it('restores a persisted session before becoming ready', async () => {
    mock.methods.getSession.mockResolvedValue({ data: { session: testSession }, error: null });
    // Restoration has already started; use an auth event to simulate SDK INITIAL_SESSION.
    mock.emit('INITIAL_SESSION', testSession);
    await auth.ready;
    expect(auth.initialized()).toBe(true);
    expect(auth.user()?.id).toBe(testSession.user.id);
  });

  it('uses refreshed tokens and responds to cross-tab sign-out', async () => {
    await auth.ready;
    mock.emit('TOKEN_REFRESHED', { ...testSession, access_token: 'refreshed-token' });
    expect(await auth.accessToken()).toBe('refreshed-token');
    mock.emit('SIGNED_OUT', null);
    expect(auth.user()).toBeNull();
    expect(await auth.accessToken()).toBeNull();
  });

  it('signs in with only email and password', async () => {
    expect(await auth.login(' test@example.com ', 'secret-password')).toBeNull();
    expect(mock.methods.signInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'secret-password' });
    expect(auth.user()?.id).toBe(testSession.user.id);
  });

  it('keeps confirmation-required registrations signed out', async () => {
    expect(await auth.register('test@example.com', 'secret-password')).toBe('confirmation');
    expect(auth.user()).toBeNull();
    expect(mock.methods.signUp).toHaveBeenCalledWith({ email: 'test@example.com', password: 'secret-password', options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
  });

  it('handles rejected passwords and registrations without exposing provider details', async () => {
    const rejected = { data: { session: null }, error: new AuthError('private provider response') };
    mock.methods.signInWithPassword.mockResolvedValue(rejected);
    mock.methods.signUp.mockResolvedValue(rejected);
    expect(await auth.login('test@example.com', 'invalid-password')).toContain('Unable to sign in');
    expect(await auth.register('test@example.com', 'invalid-password')).toContain('Unable to register');
    expect(auth.user()).toBeNull();
  });

  it('accepts immediate registration sessions when email confirmation is disabled', async () => {
    mock.methods.signUp.mockResolvedValue({ data: { session: testSession }, error: null });
    expect(await auth.register('test@example.com', 'secret-password')).toBe('signed-in');
    expect(auth.user()?.id).toBe(testSession.user.id);
  });

  it('exchanges confirmation codes and clears state on successful logout', async () => {
    expect(await auth.confirm('confirmation-code')).toBe(true);
    expect(mock.methods.exchangeCodeForSession).toHaveBeenCalledWith('confirmation-code');
    expect(await auth.logout()).toBeNull();
    expect(mock.methods.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(auth.user()).toBeNull();
  });

  it('does not report successful logout when the SDK fails', async () => {
    await auth.login('test@example.com', 'secret-password');
    mock.methods.signOut.mockRejectedValue(new Error('private transport details'));
    expect(await auth.logout()).toBe('Unable to sign out. Please try again.');
    expect(auth.user()).not.toBeNull();
  });

  it('handles authentication and refresh failures without revealing details', async () => {
    mock.methods.signInWithPassword.mockRejectedValue(new Error('private password'));
    expect(await auth.login('test@example.com', 'secret-password')).toBe('Unable to reach sign-in. Please try again.');
    mock.methods.getSession.mockRejectedValue(new Error('private refresh token'));
    expect(await auth.accessToken()).toBeNull();
  });

  it('unsubscribes from auth events on destruction', async () => {
    await auth.ready;
    TestBed.resetTestingModule();
    expect(mock.unsubscribe).toHaveBeenCalledOnce();
  });
});
