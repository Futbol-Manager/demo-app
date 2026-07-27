import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { RegisterService, AbonadoRegisterPayload } from 'src/app/core/services/register/register.service';
import { POLICY_VERSION } from 'src/app/core/models/master/masters.enum';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ClubAbonadoFormService } from 'src/app/core/services/club-abonado-form/club-abonado-form.service';
import {
  AbonadoFormCatalog,
  AbonadoFormField,
  AbonadoFormSchema,
  AbonadoFormSection,
  AbonadoFormSectionId,
  AbonadoFormSlotCatalogItem,
} from 'src/app/core/services/club-abonado-form/club-abonado-form.model';
import { environment } from 'src/environments/environment';
import { APP_LANGUAGE_OPTIONS, isAppLangCode } from 'src/app/core/constants/app-supported-languages';

interface PublicClub {
  clubId: number;
  name: string;
  imgPerfil: string | null;
}

/** SO detectado del usuario, usado para elegir botón de Store por defecto. */
type DeviceOs = 'ios' | 'android' | 'desktop';

/** Resumen ya procesado de un campo dinámico para el template. */
interface RenderField {
  controlKey: string;
  type: AbonadoFormField['type'];
  label: string;
  text?: string;
  required: boolean;
  options: string[];
  binding?: string;
  fileUrl?: string;
  fileName?: string;
}

interface RenderSection {
  id: AbonadoFormSectionId;
  title: string;
  fields: RenderField[];
}

/**
 * Pantalla pública de auto-registro de abonados (versión demo).
 *
 * Reproduce el flujo de producción en 3 pasos (buscar club → formulario →
 * éxito) pero cableada a los servicios demo: la búsqueda de clubs, la
 * plantilla del formulario y el registro devuelven datos ficticios y no
 * afectan a producción. Se ha omitido el cropper de foto de perfil y el
 * auto-login real (en demo no hay sesión que iniciar).
 */
@Component({
  selector: 'app-register-abonado',
  templateUrl: './register-abonado.component.html',
  styleUrls: ['./register-abonado.component.scss'],
})
export class RegisterAbonadoComponent implements OnInit, OnDestroy {
  readonly languageOptions = APP_LANGUAGE_OPTIONS;
  langMenuOpen = false;

  /** Paso actual del flujo (1 = buscar club, 2 = formulario, 3 = éxito). */
  step: 1 | 2 | 3 = 1;

  /** Buscador de clubs. */
  clubSearchTerm = '';
  clubResults: PublicClub[] = [];
  searching = false;
  searchedAtLeastOnce = false;
  selectedClub: PublicClub | null = null;
  imageBaseUrl = environment.images;

  form!: FormGroup;
  dynamicForm: FormGroup | null = null;
  showPassword = false;
  submitting = false;
  loadingSchema = false;

  schemaSections: RenderSection[] = [];
  hasDynamicSchema = false;
  private catalog: AbonadoFormCatalog | null = null;
  private slotByKey: Record<string, AbonadoFormSlotCatalogItem> = {};

  serverError: string | null = null;

  os: DeviceOs = 'desktop';

  readonly playStoreUrl =
    'https://play.google.com/store/apps/details?id=com.futbol.sphairatech&pcampaignid=web_share';
  readonly appStoreUrl =
    'https://apps.apple.com/es/app/sphaira-tech/id6745791142';

  private preloadAttempted = false;

  private readonly searchSubject$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  private readonly CLUB_ONLY_SLOTS = new Set<string>(['abonado_numero_socio']);

  get currentLangLabel(): string {
    const code = (this.translate.currentLang || 'es') as string;
    const opt = this.languageOptions.find(o => o.code === code);
    return opt ? opt.label : code.toUpperCase();
  }

  constructor(
    private fb: FormBuilder,
    private registerService: RegisterService,
    private clubAbonadoFormService: ClubAbonadoFormService,
    private notification: NotificationService,
    public translate: TranslateService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.os = this.detectOs();
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(60)]],
      dni: ['', [Validators.maxLength(30)]],
      telefono: ['', [Validators.maxLength(30)]],
      fechaNacimiento: [''],
      direccion: ['', [Validators.maxLength(500)]],
      genero: [''],
      acceptTerms: [false, [Validators.requiredTrue]],
    });

    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => this.runSearch(term));

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(qp => {
        if (this.preloadAttempted) return;
        const clubIdParam = qp.get('clubId');
        if (!clubIdParam) return;
        const clubId = Number(clubIdParam);
        if (!Number.isFinite(clubId) || clubId <= 0) return;
        this.preloadAttempted = true;
        this.preloadClubFromQr(clubId);
      });
  }

  private preloadClubFromQr(clubId: number): void {
    this.registerService.getPublicClubById(clubId).subscribe({
      next: resp => {
        const club = resp?.data as PublicClub | undefined;
        if (!club || !club.clubId) return;
        setTimeout(() => {
          this.selectedClub = club;
          this.step = 2;
          this.loadClubSchema(club.clubId);
          this.cdr.markForCheck();
        }, 0);
      },
      error: () => {
        this.notification.error('REGISTER_ABONADO.ERRORS.CLUB_NOT_FOUND');
      },
    });
  }

  onClubImageError(event: Event, club: PublicClub | null): void {
    if (club) club.imgPerfil = null;
    const target = event.target as HTMLImageElement | null;
    if (target) target.style.display = 'none';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClubSearchChange(): void {
    const term = (this.clubSearchTerm || '').trim();
    if (term.length < 2) {
      this.clubResults = [];
      this.searchedAtLeastOnce = false;
      return;
    }
    this.searching = true;
    this.searchSubject$.next(term);
  }

  private runSearch(term: string): void {
    this.registerService.searchClubsForAbonado(term).subscribe({
      next: (resp) => {
        this.searching = false;
        this.searchedAtLeastOnce = true;
        this.clubResults = (resp?.data ?? []) as PublicClub[];
      },
      error: () => {
        this.searching = false;
        this.searchedAtLeastOnce = true;
        this.clubResults = [];
      },
    });
  }

  selectClub(club: PublicClub): void {
    this.selectedClub = club;
    this.step = 2;
    this.serverError = null;
    this.loadClubSchema(club.clubId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private loadClubSchema(clubId: number): void {
    this.loadingSchema = true;
    this.hasDynamicSchema = false;
    this.dynamicForm = null;
    this.schemaSections = [];

    forkJoin({
      catalog: this.clubAbonadoFormService.getCatalog().pipe(catchError(() => of(null))),
      template: this.clubAbonadoFormService.getPublicTemplate(clubId).pipe(catchError(() => of(null))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ catalog, template }) => {
        this.loadingSchema = false;
        this.catalog = catalog;
        this.slotByKey = {};
        if (catalog?.slots) {
          for (const slot of catalog.slots) this.slotByKey[slot.key] = slot;
        }
        if (!template || !template.schema || !template.active) {
          this.hasDynamicSchema = false;
          this.cdr.markForCheck();
          return;
        }
        this.buildDynamicForm(template.schema);
        this.cdr.markForCheck();
      });
  }

  private buildDynamicForm(schema: AbonadoFormSchema): void {
    const sections: RenderSection[] = [];
    const group: Record<string, AbstractControl> = {};
    let anyField = false;

    for (const sec of schema.sections || []) {
      const rendered: RenderField[] = [];
      for (const field of sec.fields || []) {
        if (field.binding && this.CLUB_ONLY_SLOTS.has(field.binding)) continue;
        const isInput = field.type !== 'info';
        const label = this.resolveLabel(field);
        const options = field.options ?? this.slotByKey[field.binding ?? '']?.options ?? [];
        const required = !!field.required;
        const renderField: RenderField = {
          controlKey: field.id,
          type: field.type,
          label,
          text: field.text,
          required,
          options,
          binding: field.binding,
          fileUrl: field.fileUrl,
          fileName: field.fileName,
        };
        rendered.push(renderField);
        if (isInput) {
          const validators = this.buildValidators(field);
          const initial: unknown =
            field.type === 'consent' || field.type === 'checkbox'
              ? false
              : field.type === 'multi_check'
              ? []
              : '';
          group[field.id] = this.fb.control(initial, validators);
          anyField = true;
        }
      }
      sections.push({
        id: sec.id,
        title: this.resolveSectionTitle(sec),
        fields: rendered,
      });
    }

    this.schemaSections = sections;
    this.dynamicForm = anyField ? this.fb.group(group) : null;
    this.hasDynamicSchema = anyField;
  }

  private resolveLabel(field: AbonadoFormField): string {
    if (field.binding) {
      const slot = this.slotByKey[field.binding];
      if (slot?.labelKey) return this.translate.instant(slot.labelKey);
    }
    return field.label || field.id;
  }

  private resolveSectionTitle(sec: AbonadoFormSection): string {
    if (sec.title && sec.title.trim().length > 0) return sec.title;
    switch (sec.id) {
      case 'personales': return this.translate.instant('ABONADO_FORM_BUILDER.SECTIONS.PERSONALES');
      case 'domicilio':  return this.translate.instant('ABONADO_FORM_BUILDER.SECTIONS.DOMICILIO');
      case 'bancarios':  return this.translate.instant('ABONADO_FORM_BUILDER.SECTIONS.BANCARIOS');
      case 'emergencia': return this.translate.instant('ABONADO_FORM_BUILDER.SECTIONS.EMERGENCIA');
      case 'extras':     return this.translate.instant('ABONADO_FORM_BUILDER.SECTIONS.EXTRAS');
      default: return sec.id;
    }
  }

  private buildValidators(field: AbonadoFormField): ValidatorFn[] {
    const v: ValidatorFn[] = [];
    if (field.required) {
      if (field.type === 'consent') v.push(Validators.requiredTrue);
      else if (field.type === 'multi_check') v.push((c) => Array.isArray(c.value) && c.value.length > 0 ? null : { required: true });
      else if (field.type === 'checkbox') v.push(Validators.requiredTrue);
      else v.push(Validators.required);
    }
    if (field.type === 'text' || field.type === 'textarea') v.push(Validators.maxLength(500));
    if (field.binding === 'abonado_iban') v.push(Validators.pattern(/^[A-Z0-9 ]{4,40}$/i));
    return v;
  }

  backToSearch(): void {
    this.step = 1;
    this.serverError = null;
  }

  changeLanguage(code: string): void {
    if (!isAppLangCode(code)) return;
    this.translate.use(code);
    try { localStorage.setItem('app_lang', code); } catch { /* localStorage puede estar deshabilitado */ }
    this.langMenuOpen = false;
  }

  toggleMultiCheck(controlKey: string, option: string, checked: boolean): void {
    if (!this.dynamicForm) return;
    const ctrl = this.dynamicForm.get(controlKey);
    if (!ctrl) return;
    const current: string[] = Array.isArray(ctrl.value) ? [...ctrl.value] : [];
    const idx = current.indexOf(option);
    if (checked && idx === -1) current.push(option);
    if (!checked && idx >= 0) current.splice(idx, 1);
    ctrl.setValue(current);
    ctrl.markAsDirty();
    ctrl.markAsTouched();
  }

  isMultiCheckSelected(controlKey: string, option: string): boolean {
    if (!this.dynamicForm) return false;
    const v = this.dynamicForm.get(controlKey)?.value;
    return Array.isArray(v) && v.includes(option);
  }

  submit(): void {
    this.serverError = null;
    if (!this.selectedClub) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    if (this.hasDynamicSchema && this.dynamicForm && this.dynamicForm.invalid) {
      this.dynamicForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    this.submitting = true;
    const value = this.form.value;

    const payload: AbonadoRegisterPayload = {
      email: (value.email || '').trim().toLowerCase(),
      password: value.password,
      nombre: (value.nombre || '').trim(),
      apellidos: (value.apellidos || '').trim(),
      clubId: this.selectedClub.clubId,
      language: this.translate.currentLang || 'es',
      aceptaPrivacidad: value.acceptTerms ? 1 : 0,
      comunicaciones: 0,
      policyVersion: POLICY_VERSION,
    };

    if (this.hasDynamicSchema) {
      const answers = this.buildAnswersPayload();
      payload.answers = answers;
      this.lift(answers, 'personales', 'abonado_dni',              payload, 'dni');
      this.lift(answers, 'domicilio',  'abonado_telefono',         payload, 'telefono');
      this.lift(answers, 'personales', 'abonado_fecha_nacimiento', payload, 'fechaNacimiento');
      this.lift(answers, 'personales', 'abonado_genero',           payload, 'genero');
      this.lift(answers, 'domicilio',  'abonado_direccion',        payload, 'direccion');
    } else {
      payload.dni = (value.dni || '').trim() || undefined;
      payload.telefono = (value.telefono || '').trim() || undefined;
      payload.fechaNacimiento = value.fechaNacimiento || undefined;
      payload.direccion = (value.direccion || '').trim() || undefined;
      payload.genero = value.genero || undefined;
    }

    this.registerService.registerAbonado(payload).subscribe({
      next: () => {
        setTimeout(() => {
          this.submitting = false;
          this.notification.success('REGISTER_ABONADO.MESSAGES.WELCOME');
          this.step = 3;
          this.cdr.markForCheck();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 0);
      },
      error: (err) => {
        const status = err?.status;
        setTimeout(() => {
          this.submitting = false;
          if (status === 409) {
            this.serverError = this.translate.instant('REGISTER_ABONADO.ERRORS.EMAIL_TAKEN');
          } else if (status === 400) {
            this.serverError = this.translate.instant('REGISTER_ABONADO.ERRORS.INVALID');
          } else {
            this.serverError = this.translate.instant('REGISTER_ABONADO.ERRORS.GENERIC');
          }
          this.cdr.markForCheck();
        }, 0);
      },
    });
  }

  private buildAnswersPayload(): Record<string, unknown> {
    const out: Record<string, Record<string, unknown>> = {
      personales: {},
      domicilio: {},
      bancarios: {},
      emergencia: {},
      extras: {},
    };
    const consents: Array<{ id: string; accepted: boolean; ts: string }> = [];
    if (!this.dynamicForm) {
      return { ...out, consents };
    }
    const now = new Date().toISOString();
    for (const sec of this.schemaSections) {
      const bucket = out[sec.id] || {};
      for (const f of sec.fields) {
        if (f.type === 'info') continue;
        const raw = this.dynamicForm.get(f.controlKey)?.value;
        const key = f.binding || f.controlKey;
        bucket[key] = raw === undefined ? null : raw;
        if (f.type === 'consent') {
          consents.push({ id: f.controlKey, accepted: !!raw, ts: now });
        }
      }
      out[sec.id] = bucket;
    }
    return { ...out, consents };
  }

  private lift(
    answers: Record<string, unknown>,
    section: AbonadoFormSectionId,
    slotKey: string,
    payload: AbonadoRegisterPayload,
    payloadKey: keyof AbonadoRegisterPayload,
  ): void {
    const sec = answers[section] as Record<string, unknown> | undefined;
    if (!sec) return;
    const v = sec[slotKey];
    if (v == null || (typeof v === 'string' && v.trim() === '')) return;
    (payload as unknown as Record<string, unknown>)[payloadKey as string] =
      typeof v === 'string' ? v.trim() : v;
  }

  goToDashboard(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.router.navigate(['/dashboard/inicio']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  openStore(target: 'ios' | 'android'): void {
    const url = target === 'android' ? this.playStoreUrl : this.appStoreUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private detectOs(): DeviceOs {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = (navigator.userAgent || '').toLowerCase();
    const platform = ((navigator as unknown as { platform?: string }).platform || '').toLowerCase();
    const isIPadOS =
      /macintosh/.test(ua) && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1;
    if (/iphone|ipad|ipod/.test(ua) || /ipad|iphone|ipod/.test(platform) || isIPadOS) {
      return 'ios';
    }
    if (/android/.test(ua)) {
      return 'android';
    }
    return 'desktop';
  }

  isInvalid(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  isDynamicInvalid(controlKey: string): boolean {
    if (!this.dynamicForm) return false;
    const c = this.dynamicForm.get(controlKey);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
}
