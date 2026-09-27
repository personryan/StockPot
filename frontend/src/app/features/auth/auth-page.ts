import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto max-w-md px-6 py-16">
      <a routerLink="/" class="font-semibold text-emerald-700">StockPot</a>
      <h1 class="mt-8 text-3xl font-bold">{{ registering ? 'Create your account' : 'Welcome back' }}</h1>
      <p class="mt-3 text-slate-600">{{ registering ? 'Start with your email and a password.' : 'Sign in to your StockPot account.' }}</p>
      @if (!auth.configured) { <p class="mt-4" role="alert">Authentication is not configured.</p> }
      <form class="mt-8 flex flex-col gap-3" [formGroup]="form" (ngSubmit)="submit()">
        <label for="email">Email</label>
        <input pInputText id="email" type="email" formControlName="email" autocomplete="email" aria-describedby="form-help" />
        <label for="password" class="mt-3">Password</label>
        <input pInputText id="password" type="password" formControlName="password" [attr.autocomplete]="registering ? 'new-password' : 'current-password'" aria-describedby="form-help" />
        <p id="form-help" class="text-sm text-slate-600">{{ registering ? 'Use at least 8 characters. Your project may require a stronger password.' : 'Enter your email and password.' }}</p>
        @if (submitted() && form.invalid) { <p role="alert">Enter a valid email and {{ registering ? 'a password of at least 8 characters.' : 'your password.' }}</p> }
        @if (error()) { <p role="alert" class="text-red-700">{{ error() }}</p> }
        @if (confirmation()) { <p role="status">Check your email for a confirmation link, then sign in. If you already have an account, try signing in.</p> }
        <p-button type="submit" [label]="registering ? 'Create account' : 'Sign in'" [loading]="busy()" [disabled]="busy() || !auth.configured" />
      </form>
      <p class="mt-6"><a class="text-emerald-700 underline" [routerLink]="registering ? '/login' : '/register'">{{ registering ? 'Already have an account? Sign in' : 'Create an account' }}</a></p>
    </main>
  `,
})
export class AuthPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly registering = inject(ActivatedRoute).snapshot.data['mode'] === 'register';
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', this.registering ? [Validators.required, Validators.minLength(8)] : [Validators.required]],
  });
  readonly busy = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly confirmation = signal(false);

  async submit() {
    if (this.busy()) return;
    this.submitted.set(true);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true);
    this.error.set('');
    this.confirmation.set(false);
    const { email, password } = this.form.getRawValue();
    try {
      const result = this.registering ? await this.auth.register(email, password) : await this.auth.login(email, password);
      this.form.controls.password.reset();
      this.submitted.set(false);
      if (result === null || result === 'signed-in') await this.router.navigateByUrl('/account');
      else if (result === 'confirmation') this.confirmation.set(true);
      else this.error.set(result);
    } finally { this.busy.set(false); }
  }
}
