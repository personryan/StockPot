import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/auth-page').then(m => m.AuthPage) },
  { path: 'register', data: { mode: 'register' }, loadComponent: () => import('./features/auth/auth-page').then(m => m.AuthPage) },
  { path: 'auth/callback', loadComponent: () => import('./features/auth/auth-callback').then(m => m.AuthCallback) },
  { path: 'account', canActivate: [authGuard], loadComponent: () => import('./features/auth/account').then(m => m.Account) },
  { path: '**', redirectTo: '' },
];
