import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { providePrimeNG } from 'primeng/config';
import { routes } from '../../app.routes';
import { AuthService } from '../../core/auth/auth.service';
import { mockAuth } from '../../core/auth/auth.testing';
import { SUPABASE_AUTH } from '../../core/auth/supabase-auth';
import { AuthPage } from './auth-page';
import { AuthCallback } from './auth-callback';
import { Account } from './account';
import { environment } from '../../../environments/environment';

describe('Authentication screens', () => {
  let mock: ReturnType<typeof mockAuth>;
  let http: HttpTestingController;
  beforeEach(() => {
    mock = mockAuth();
    TestBed.configureTestingModule({ providers: [
      provideRouter(routes), providePrimeNG(), provideHttpClient(), provideHttpClientTesting(),
      { provide: SUPABASE_AUTH, useValue: mock.client },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('validates the form before calling Supabase', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/register', AuthPage);
    page.form.setValue({ email: 'invalid', password: 'short' });
    await page.submit();
    harness.detectChanges();
    expect(mock.methods.signUp).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.textContent).toContain('Enter a valid email');
  });

  it('shows email confirmation without entering a protected route', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/register', AuthPage);
    page.form.setValue({ email: 'test@example.com', password: 'valid-password' });
    await page.submit();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Check your email');
    expect(TestBed.inject(Router).url).toBe('/register');
    expect(page.form.controls.password.value).toBe('');
  });

  it('signs in, verifies with Go, and signs out to login', async () => {
    const harness = await RouterTestingHarness.create();
    const login = await harness.navigateByUrl('/login', AuthPage);
    login.form.setValue({ email: 'test@example.com', password: 'valid-password' });
    await login.submit();
    harness.detectChanges();
    const account = harness.routeDebugElement?.componentInstance as Account;
    http.expectOne(`${environment.apiUrl.replace(/\/$/, '')}/auth/me`).flush({ id: 'verified-id' });
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/account');
    expect(harness.routeNativeElement?.textContent).toContain('Your session is verified');
    await account.logout();
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(TestBed.inject(AuthService).user()).toBeNull();
  });

  it('keeps failed sign-in on the login page with a safe error', async () => {
    mock.methods.signInWithPassword.mockRejectedValue(new Error('sensitive detail'));
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/login', AuthPage);
    page.form.setValue({ email: 'test@example.com', password: 'valid-password' });
    await page.submit();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.textContent).toContain('Please try again');
    expect(harness.routeNativeElement?.textContent).not.toContain('sensitive detail');
  });

  it('handles missing or failed confirmation codes without signing in', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/auth/callback?error=private-message', AuthCallback);
    harness.detectChanges();
    expect(mock.methods.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.textContent).toContain('Could not complete sign-in');
    expect(window.location.search).toBe('');
  });

  it('exchanges the callback code before opening the protected account', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/auth/callback?code=test-confirmation-code');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/account'));
    harness.detectChanges();
    http.expectOne(`${environment.apiUrl.replace(/\/$/, '')}/auth/me`).flush({ id: 'verified-id' });
    expect(mock.methods.exchangeCodeForSession).toHaveBeenCalledWith('test-confirmation-code');
    expect(window.location.search).toBe('');
  });
});
