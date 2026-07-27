import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

import {
  AbonadoFormAnswers,
  AbonadoFormCatalog,
  AbonadoFormSchema,
  AbonadoFormTemplate,
  EMPTY_ABONADO_FORM_SCHEMA,
} from './club-abonado-form.model';

/** Sobre estándar de respuestas REST del backend Sphaira. */
interface ApiResponse<T> {
  error: { code: number; msg: string } | null;
  data: T;
  status: number;
}

/**
 * Cliente HTTP del formulario dinámico de abonados. En demo devuelve un
 * catálogo/plantilla ficticios sin tocar el backend.
 */
@Injectable({ providedIn: 'root' })
export class ClubAbonadoFormService {
  private readonly base = environment.apiUrl + 'club-abonado-form';

  constructor(private http: HttpClient) {}

  getCatalog(): Observable<AbonadoFormCatalog> {
    if (isDemoMode()) {
      return of({
        version: 1,
        sections: ['personales', 'domicilio', 'bancarios', 'emergencia', 'extras'],
        fieldTypes: ['text', 'textarea', 'number', 'date', 'select', 'checkbox', 'multi_check', 'consent', 'info', 'document', 'file_upload'],
        slots: [],
      } as AbonadoFormCatalog);
    }
    return this.http
      .get<ApiResponse<AbonadoFormCatalog>>(`${this.base}/catalog`)
      .pipe(map((r) => r.data));
  }

  getPublicTemplate(clubId: number): Observable<AbonadoFormTemplate | null> {
    if (isDemoMode()) {
      return of({
        templateId: 601,
        clubId,
        active: 1,
        schema: {
          version: 1,
          sections: [
            {
              id: 'personales',
              title: 'Datos personales',
              fields: [
                { id: 'genero', type: 'select', label: 'Género', required: false, options: ['Hombre', 'Mujer', 'Otro'] },
              ],
            },
            {
              id: 'extras',
              title: 'Extras',
              fields: [
                { id: 'consent_socio', type: 'consent', label: 'Condiciones de socio', required: true, text: 'Acepto las condiciones de socio y la política de privacidad del club.' },
              ],
            },
          ],
        },
      } as AbonadoFormTemplate);
    }
    return this.http
      .get<ApiResponse<AbonadoFormTemplate | null>>(`${this.base}/club/${clubId}`)
      .pipe(map((r) => r.data));
  }

  getAdminTemplate(clubId: number): Observable<AbonadoFormTemplate> {
    if (isDemoMode()) {
      return of({
        templateId: null,
        clubId,
        active: 1,
        schema: EMPTY_ABONADO_FORM_SCHEMA,
        default: true,
      } as AbonadoFormTemplate);
    }
    return this.http
      .get<ApiResponse<AbonadoFormTemplate>>(`${this.base}/club/${clubId}/admin`)
      .pipe(map((r) => r.data));
  }

  saveTemplate(
    clubId: number,
    schema: AbonadoFormSchema,
    active: number = 1
  ): Observable<AbonadoFormTemplate> {
    if (isDemoMode()) {
      return of({ templateId: 601, clubId, active, schema } as AbonadoFormTemplate);
    }
    return this.http
      .put<ApiResponse<AbonadoFormTemplate>>(`${this.base}/club/${clubId}`, {
        schema,
        active,
      })
      .pipe(map((r) => r.data));
  }

  getResponse(clubId: number, abonadoId: number): Observable<{
    responseId: number | null;
    templateId: number;
    clubId: number;
    abonadoId: number;
    answers: AbonadoFormAnswers;
    createdAt?: string;
    updatedAt?: string;
  } | null> {
    if (isDemoMode()) {
      return of(null);
    }
    return this.http
      .get<ApiResponse<any>>(`${this.base}/club/${clubId}/abonado/${abonadoId}/response`)
      .pipe(map((r) => r.data));
  }

  updateResponse(
    clubId: number,
    abonadoId: number,
    answers: AbonadoFormAnswers
  ): Observable<unknown> {
    if (isDemoMode()) {
      return of(null);
    }
    return this.http
      .put<ApiResponse<unknown>>(
        `${this.base}/club/${clubId}/abonado/${abonadoId}/response`,
        answers
      )
      .pipe(map((r) => r.data));
  }
}
