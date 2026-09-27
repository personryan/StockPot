import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-account',
  imports: [ButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto max-w-lg px-6 py-16">
      <a routerLink="/" class="font-semibold text-emerald-700">StockPot</a>
      <h1 class="mt-8 text-3xl font-bold">Your account</h1>
      <p class="my-4">Signed in as {{ auth.user()?.email }}</p>
      <p class="my-4" role="status">{{ status() }}</p>
      @if (error()) { <p class="my-4 text-red-700" role="alert">{{ error() }}</p> }
      <div class="flex gap-3">
        <p-button label="Verify connection" [loading]="checking()" [disabled]="checking()" (onClick)="verify()" />
        <p-button label="Sign out" severity="secondary" [loading]="busy()" [disabled]="busy()" (onClick)="logout()" />
      </div>
    </main>
  `,
})
export class Account implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly status = signal('Verifying your session…');
  readonly checking = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => {
      if (this.auth.initialized() && !this.auth.user()) void this.router.navigateByUrl('/login');
    });
  }
  ngOnInit() { this.verify(); }
  verify() {
    if (this.checking()) return;
    this.checking.set(true);
    this.http.get<{ id: string; email?: string }>(`${environment.apiUrl.replace(/\/$/, '')}/auth/me`)
      .pipe(timeout(8000), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.checking.set(false); this.status.set('Your session is verified by StockPot.'); },
        error: (err: HttpErrorResponse) => {
          this.checking.set(false);
          this.status.set(err.status === 401 ? 'Your session could not be verified. Please sign out and sign in again.' : 'Verification is unavailable. Please try again.');
        },
      });
  }
  async logout() {
    if (this.busy()) return;
    this.busy.set(true);
    const error = await this.auth.logout();
    this.busy.set(false);
    this.error.set(error ?? '');
    if (!error) await this.router.navigateByUrl('/login');
  }
}
