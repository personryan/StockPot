import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';
import { mockAuth, testSession } from './auth.testing';
import { SUPABASE_AUTH } from './supabase-auth';

@Component({ template: 'protected account' }) class ProtectedPage {}
@Component({ template: 'login page' }) class LoginPage {}

describe('Auth guard', () => {
  function setup(session = false) {
    const mock = mockAuth(session ? testSession : null);
    TestBed.configureTestingModule({ providers: [
      { provide: SUPABASE_AUTH, useValue: mock.client },
      provideRouter([{ path: 'account', canActivate: [authGuard], component: ProtectedPage }, { path: 'login', component: LoginPage }]),
    ] });
    return mock;
  }

  it('redirects signed-out users before rendering protected content', async () => {
    setup();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/account', LoginPage);
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.textContent).not.toContain('protected account');
  });

  it('waits for persisted session restoration', async () => {
    const mock = setup();
    let restore!: (value: { data: { session: typeof testSession }; error: null }) => void;
    mock.methods.getSession.mockImplementationOnce(() => new Promise(resolve => { restore = resolve; }));
    const auth = TestBed.inject(AuthService);
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/account', ProtectedPage);
    expect(auth.initialized()).toBe(false);
    restore({ data: { session: testSession }, error: null });
    await navigation;
    expect(harness.routeNativeElement?.textContent).toContain('protected account');
  });
});
