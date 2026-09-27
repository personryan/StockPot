import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('Auth interceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  const accessToken = vi.fn(async (): Promise<string | null> => 'current-token');
  const api = environment.apiUrl.replace(/\/$/, '');

  beforeEach(() => {
    accessToken.mockReset().mockResolvedValue('current-token');
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), { provide: AuthService, useValue: { accessToken } }] });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });
  afterEach(() => controller.verify());

  it('uses the current session token only for the Go API', async () => {
    http.get(`${api}/auth/me`).subscribe();
    const request = await vi.waitFor(() => controller.expectOne(`${api}/auth/me`));
    expect(request.request.headers.get('Authorization')).toBe('Bearer current-token');
    request.flush({});
  });

  it.each(['https://unrelated.example/api/auth/me', `${api}-other/auth/me`, 'http://localhost.attacker.example:8080/api/auth/me', 'https://example.supabase.co/auth/v1/user'])('does not attach tokens to %s', (url) => {
    http.get(url).subscribe();
    const request = controller.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(accessToken).not.toHaveBeenCalled();
    request.flush({});
  });

  it('removes stale manual authorization when signed out', async () => {
    accessToken.mockResolvedValue(null);
    http.get(`${api}/auth/me`, { headers: { Authorization: 'Bearer stale-token' } }).subscribe();
    const request = await vi.waitFor(() => controller.expectOne(`${api}/auth/me`));
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
