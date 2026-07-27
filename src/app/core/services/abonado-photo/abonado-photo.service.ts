import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Cliente HTTP fino contra los endpoints de foto de perfil del abonado.
 * En modo demo las subidas devuelven un nombre de archivo simulado sin
 * tocar la red.
 */
@Injectable({ providedIn: 'root' })
export class AbonadoPhotoService {
  private readonly baseUrl = `${environment.apiUrl}auth/abonado`;
  private readonly clubBaseUrl = `${environment.apiUrl}club`;

  constructor(private http: HttpClient) {}

  uploadTemp(blob: Blob): Observable<string> {
    if (isDemoMode()) return of('avatar_temp_demo.png');
    const fd = new FormData();
    fd.append('file', blob, 'avatar.png');
    return this.http
      .post<{ data: string }>(`${this.baseUrl}/photo-temp`, fd)
      .pipe(map((r) => r.data));
  }

  uploadOwn(blob: Blob): Observable<string> {
    if (isDemoMode()) return of('avatar_demo.png');
    const fd = new FormData();
    fd.append('file', blob, 'avatar.png');
    return this.http
      .post<{ data: string }>(`${this.baseUrl}/me/photo`, fd)
      .pipe(map((r) => r.data));
  }

  uploadFromClubAdmin(abonadoId: number, blob: Blob): Observable<string> {
    if (isDemoMode()) return of(`abonado_${abonadoId}_demo.png`);
    const fd = new FormData();
    fd.append('files', blob, 'avatar.png');
    return this.http
      .post<{ data: string }>(`${this.clubBaseUrl}/subirimgabonado/${abonadoId}`, fd)
      .pipe(map((r) => r.data));
  }

  resolveUrl(fileName: string | null | undefined, subPath = 'abonado'): string | null {
    if (!fileName) return null;
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) return fileName;
    return `${environment.images}${subPath}/${fileName}`;
  }
}
