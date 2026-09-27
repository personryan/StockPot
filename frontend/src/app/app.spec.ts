import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { App } from './app';
import { appConfig } from './app.config';
import { environment } from '../environments/environment';
import { SUPABASE_AUTH } from './core/auth/supabase-auth';

describe('StockPot shell', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [App], providers: [...appConfig.providers, provideHttpClientTesting(), { provide: SUPABASE_AUTH, useValue: null }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function openHome() {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    return fixture;
  }

  it('renders the shell and shows successful API health', async () => {
    const fixture = await openHome();
    const request = await vi.waitFor(() => http.expectOne(`${environment.apiUrl.replace(/\/$/, '')}/health`));
    expect(request.request.method).toBe('GET');
    request.flush({ status: 'ok' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Make more of what's at home.");
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Connected to StockPot.');
  });

  it('allows retry after an API failure', async () => {
    const fixture = await openHome();
    const url = `${environment.apiUrl.replace(/\/$/, '')}/health`;
    (await vi.waitFor(() => http.expectOne(url))).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Could not connect');
    fixture.nativeElement.querySelector('button').click();
    (await vi.waitFor(() => http.expectOne(url))).flush({ status: 'ok' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Connected to StockPot.');
  });
});
