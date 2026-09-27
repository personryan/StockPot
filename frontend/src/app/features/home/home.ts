import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { HealthService } from '../../core/health.service';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, RouterLink],
  template: `
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p class="mb-3 text-sm font-semibold tracking-widest text-emerald-700">STOCKPOT</p>
      <nav class="mb-6 flex gap-4" aria-label="Account">
        @if (auth.user()) { <a routerLink="/account" class="text-emerald-700 underline">Your account</a> }
        @else { <a routerLink="/login" class="text-emerald-700 underline">Sign in</a><a routerLink="/register" class="text-emerald-700 underline">Create account</a> }
      </nav>
      <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Make more of what's at home.</h1>
      <p class="mt-5 text-lg leading-relaxed text-slate-600">
        Your pantry, recipes, and shopping list will come together here.
      </p>
      <section class="mt-10 rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="connection-heading">
        <h2 id="connection-heading" class="text-lg font-semibold">Connection</h2>
        <p class="my-4 text-slate-600" role="status" aria-live="polite">{{ message() }}</p>
        <p-button label="Check connection" [loading]="checking()" [disabled]="checking()" (onClick)="checkConnection()" />
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  readonly auth = inject(AuthService);
  private readonly health = inject(HealthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly checking = signal(false);
  readonly message = signal('Checking connection…');

  ngOnInit() { this.checkConnection(); }

  checkConnection() {
    if (this.checking()) return;
    this.checking.set(true);
    this.message.set('Checking connection…');
    this.health.check().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.checking.set(false);
        this.message.set(response.status === 'ok' ? 'Connected to StockPot.' : 'StockPot is unavailable. Please try again.');
      },
      error: () => {
        this.checking.set(false);
        this.message.set('Could not connect to StockPot. Please try again.');
      },
    });
  }
}
