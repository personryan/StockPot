import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { timeout } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HealthResponse { status: 'ok' }

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  check() {
    return this.http.get<HealthResponse>(`${environment.apiUrl.replace(/\/$/, '')}/health`)
      .pipe(timeout(5000));
  }
}
