import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-auth-callback',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="mx-auto max-w-md px-6 py-16"><h1 class="text-2xl font-bold">Confirm your email</h1><p class="my-6" role="status">{{ message() }}</p><a routerLink="/login" class="text-emerald-700 underline">Go to sign in</a></main>`,
})
export class AuthCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly message = signal('Completing confirmation…');

  async ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code');
    const failed = this.route.snapshot.queryParamMap.has('error');
    // Remove auth codes/errors from the visible URL without logging them.
    window.history.replaceState(window.history.state, '', '/auth/callback');
    if (!failed && code && await this.auth.confirm(code)) {
      await this.router.navigateByUrl('/account', { replaceUrl: true });
    } else {
      this.message.set('Could not complete sign-in here. If your email is confirmed, sign in with your password. Otherwise request a new registration link.');
    }
  }
}
