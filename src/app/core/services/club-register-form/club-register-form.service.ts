import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';
import { DemoDataService } from '../demo/demo-data.service';
import {
  ApiEnvelope,
  ClubRegisterFormAnswers,
  ClubRegisterFormResponsePayload,
  ClubRegisterFormTemplate,
  PlayerDynamicProfile,
  PlayersTableConfig,
  PlayersTableConfigDto,
  RegisterFormBindingCatalog,
  RegisterFormSchema,
  RegisterFormVariant,
  RegisterPaymentVariantGroup,
  RegisterPaymentVariantSelection,
  UploadedDocumentInfo,
} from './club-register-form.model';

/**
 * Cliente del API del formulario extendido de registro de padres por club
 * (`/rest/club-register-form`). En modo demo devuelve plantillas y respuestas
 * ficticias sin tocar el backend.
 */
@Injectable({ providedIn: 'root' })
export class ClubRegisterFormService {
  private readonly base = `${environment.apiUrl}club-register-form`;

  constructor(private readonly http: HttpClient) {}

  /** Envoltorio Response<T> demo. */
  private demoEnvelope<T>(data: T): ApiEnvelope<T> {
    return { status: 200, data, error: { code: 0, msg: '' } };
  }

  getPublicTemplate(
    clubId: number,
    variant: RegisterFormVariant = 'minor',
  ): Observable<ApiEnvelope<ClubRegisterFormTemplate | null>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope(DemoDataService.getDemoRegisterFormTemplate(variant) as ClubRegisterFormTemplate));
    }
    return this.http.get<ApiEnvelope<ClubRegisterFormTemplate | null>>(
      `${this.base}/club/${clubId}`,
      { params: new HttpParams().set('variant', variant) },
    );
  }

  getAdminTemplate(
    clubId: number,
    variant: RegisterFormVariant = 'minor',
  ): Observable<ApiEnvelope<ClubRegisterFormTemplate>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope(DemoDataService.getDemoRegisterFormTemplate(variant) as ClubRegisterFormTemplate));
    }
    return this.http.get<ApiEnvelope<ClubRegisterFormTemplate>>(
      `${this.base}/club/${clubId}/admin`,
      { params: new HttpParams().set('variant', variant) },
    );
  }

  saveTemplate(
    clubId: number,
    schema: RegisterFormSchema,
    active: 0 | 1 = 1,
    variant: RegisterFormVariant = 'minor',
  ): Observable<ApiEnvelope<ClubRegisterFormTemplate>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope({ templateId: 501, clubId, active, schema } as ClubRegisterFormTemplate));
    }
    return this.http.put<ApiEnvelope<ClubRegisterFormTemplate>>(
      `${this.base}/club/${clubId}`,
      { schema, active },
      { params: new HttpParams().set('variant', variant) },
    );
  }

  saveResponse(payload: ClubRegisterFormResponsePayload): Observable<ApiEnvelope<unknown>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope(null));
    }
    return this.http.post<ApiEnvelope<unknown>>(`${this.base}/response`, payload);
  }

  getResponsesByUser(userId: number): Observable<ApiEnvelope<unknown[]>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope([] as unknown[]));
    }
    return this.http.get<ApiEnvelope<unknown[]>>(`${this.base}/response/user/${userId}`);
  }

  getPagosVariantesRegistroByTeam(
    clubId: number,
    teamId: number,
    temporada?: string,
  ): Observable<ApiEnvelope<RegisterPaymentVariantGroup[]>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope(DemoDataService.getDemoRegisterPaymentVariants() as RegisterPaymentVariantGroup[]));
    }
    let params = new HttpParams();
    if (temporada) {
      params = params.set('temporada', temporada);
    }
    return this.http.get<ApiEnvelope<RegisterPaymentVariantGroup[]>>(
      `${this.base}/club/${clubId}/team/${teamId}/pagos-variantes`,
      { params },
    );
  }

  saveSeleccionVariantesRegistro(payload: {
    clubId: number;
    temporada?: string;
    selecciones: RegisterPaymentVariantSelection[];
  }): Observable<ApiEnvelope<number>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope(payload.selecciones?.length || 0));
    }
    return this.http.post<ApiEnvelope<number>>(`${this.base}/variante-seleccion`, payload);
  }

  getBindingCatalog(): Observable<ApiEnvelope<RegisterFormBindingCatalog>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope(DemoDataService.getDemoRegisterBindingCatalog() as RegisterFormBindingCatalog));
    }
    return this.http.get<ApiEnvelope<RegisterFormBindingCatalog>>(
      `${this.base}/binding-catalog`,
    );
  }

  getPlayerProfile(teamId: number, playerId: number): Observable<ApiEnvelope<PlayerDynamicProfile>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope({
        hasCustomForm: false,
        clubId: 9001,
        schema: null,
        values: {},
        ownerUserId: null,
        consents: [],
      } as PlayerDynamicProfile));
    }
    const params = new HttpParams()
      .set('teamId', String(teamId))
      .set('playerId', String(playerId));
    return this.http.get<ApiEnvelope<PlayerDynamicProfile>>(
      `${this.base}/player-profile`,
      { params },
    );
  }

  savePlayerProfile(
    teamId: number,
    playerId: number,
    answers: ClubRegisterFormAnswers,
  ): Observable<ApiEnvelope<unknown>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope(null));
    }
    const params = new HttpParams()
      .set('teamId', String(teamId))
      .set('playerId', String(playerId));
    return this.http.put<ApiEnvelope<unknown>>(
      `${this.base}/player-profile`,
      { answers },
      { params },
    );
  }

  getPlayersTableConfig(clubId: number): Observable<ApiEnvelope<PlayersTableConfigDto | null>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope(null));
    }
    return this.http.get<ApiEnvelope<PlayersTableConfigDto | null>>(
      `${this.base}/club/${clubId}/players-table-config`,
    );
  }

  savePlayersTableConfig(
    clubId: number,
    config: PlayersTableConfig,
  ): Observable<ApiEnvelope<PlayersTableConfigDto>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope({ configId: 1, clubId, config } as PlayersTableConfigDto));
    }
    return this.http.put<ApiEnvelope<PlayersTableConfigDto>>(
      `${this.base}/club/${clubId}/players-table-config`,
      { config },
    );
  }

  uploadDocument(
    clubId: number,
    file: File,
  ): Observable<ApiEnvelope<UploadedDocumentInfo>> {
    if (isDemoMode()) {
      return of(this.demoEnvelope({
        fileUrl: '/assets/images/demo-doc.pdf',
        fileName: file.name,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
      } as UploadedDocumentInfo));
    }
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ApiEnvelope<UploadedDocumentInfo>>(
      `${this.base}/club/${clubId}/document-upload`,
      formData,
    );
  }
}
