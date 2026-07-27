import { Component, HostListener, OnInit, QueryList, ViewChildren } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { LoginService } from 'src/app/core/services/login/login.service';
import { LoginModel } from 'src/app/core/models/users/login.model';
import { TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';
import { ClubRegisterFormService } from 'src/app/core/services/club-register-form/club-register-form.service';
import {
  ClubRegisterFormAnswers,
  RegisterFormSchema,
  RegisterFormSectionId,
  RegisterPaymentVariantGroup,
} from 'src/app/core/services/club-register-form/club-register-form.model';
import { DynamicRegisterFieldsComponent } from '../dynamic-register-fields/dynamic-register-fields.component';

type Step = 'padre' | 'hijos';

@Component({
  selector: 'app-parent-children',
  templateUrl: './parent-children.component.html',
  styleUrls: ['./parent-children.component.scss'],
})
export class ParentChildrenComponent implements OnInit {
  activeTab: 'padre' | 'hijos' = 'padre';
  modo: 'club' | 'email' = 'club';
  clubId = 0;
  clubName = '';
  clubPicture = '';

  /** Equipos elegibles del club (registro por club). El padre asigna un equipo por hijo. */
  clubTeams: { teamId: number; name: string; category?: string }[] = [];
  clubTeamsLoaded = false;

  /** Formulario extendido del club (secciones tutor/general/child). Null si no hay. */
  registerSchema: RegisterFormSchema | null = null;
  hasGeneralExtras = false;
  hasTutorExtras = false;
  hasChildExtras = false;

  /** Pagos con variantes del registro, cacheados por equipo. */
  teamPaymentGroups: { [teamId: number]: RegisterPaymentVariantGroup[] } = {};
  private loadingTeamIds = new Set<number>();
  /** Selección del padre: variantSelections[hijoIndex][pagoClubId] = varianteId (-1 = precio fijo aceptado). */
  variantSelections: { [hijoIndex: number]: { [pagoClubId: number]: number } } = {};
  showMissingBanner = false;

  @ViewChildren(DynamicRegisterFieldsComponent)
  dynamicSections!: QueryList<DynamicRegisterFieldsComponent>;

  playerId!: number;
  emailFromUrl!: string;
  isMenor!: boolean;
  vieneDeInvitacion = false;
  esPadreAsociadoAJugador = false;

  parentForm!: FormGroup;
  childrenForm!: FormGroup;
  estadoValidacionHijos: (boolean | undefined)[] = [];
  hijosVisibles: number[] = [];
  registerFormPadreHijos!: FormGroup;
  isLoading: boolean = false;

  showConsentModal = false;
  modalConsentChecked = false;
  showConsentWarning = false;
  pendingConsentAction: 'club' | 'email' | null = null;

  showLangDropdown = false;
  selectedLang = localStorage.getItem('lang') || 'es';
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private registerService: RegisterService,
    private router: Router,
    private snackBar: MatSnackBar,
    private loginService: LoginService,
    private translate: TranslateService,
    private clubRegisterFormApi: ClubRegisterFormService,
  ) {}

  // ======================================================
  // INIT
  // ======================================================
  ngOnInit(): void {
    this.detectarOrigen();
    this.initForms();
    this.updateChildren();

    // 📧 Precargar email solo si viene del EMAIL
    if (this.modo === 'email' && this.emailFromUrl) {
      this.parentForm.patchValue({
        email: this.emailFromUrl,
        confirmEmail: this.emailFromUrl,
      });
    }
  }
  // ======================================================
  // DETECTAR ORIGEN DE LA RUTA
  // ======================================================
  private detectarOrigen(): void {
    this.route.paramMap.subscribe((params) => {
      // EMAIL
      if (params.has('playerId')) {
        this.modo = 'email';
        this.playerId = +params.get('playerId')!;
        this.emailFromUrl = params.get('email')!;
        this.isMenor = params.get('isMenor') === '1';

        this.esPadreAsociadoAJugador = this.isMenor;
        this.activeTab = 'padre';
      }

      // CLUB
      else if (params.has('clubId')) {
        this.modo = 'club';
        this.clubId = +params.get('clubId')!;
        this.activeTab = 'padre';
        this.loadClubInfo(this.clubId);
        this.loadClubTeams(this.clubId);
        this.loadRegisterSchema(this.clubId);
      }
    });
  }

  /** Carga nombre + escudo del club para la cabecera del wizard. */
  private loadClubInfo(clubId: number): void {
    this.registerService.getClubPublicInfo(clubId).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data) {
          this.clubName = data.name ?? '';
          const pic = data.picture ?? data.pictureClub;
          this.clubPicture = pic ? environment.images + 'user/' + pic : '';
        }
      },
      error: () => { /* la pantalla funciona sin escudo */ },
    });
  }

  /** Carga los equipos públicos del club para asignar cada hijo. */
  private loadClubTeams(clubId: number): void {
    this.clubTeamsLoaded = false;
    this.registerService.getPublicTeamsForRegistration(clubId).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.clubTeams = list
          .filter((t: any) => t && t.teamId > 0 && typeof t.name === 'string' && t.name.trim() !== '')
          .map((t: any) => ({
            teamId: Number(t.teamId),
            name: String(t.name).trim(),
            category: t.category ? String(t.category) : '',
          }));
        this.clubTeamsLoaded = true;
      },
      error: () => {
        this.clubTeams = [];
        this.clubTeamsLoaded = true;
      },
    });
  }

  /** Carga la plantilla del formulario extendido del club (o null si no hay). */
  private loadRegisterSchema(clubId: number, variant: 'minor' | 'adult' = 'minor'): void {
    this.clubRegisterFormApi.getPublicTemplate(clubId, variant).subscribe({
      next: (res) => {
        const tpl = res?.data;
        if (tpl && tpl.schema && Array.isArray(tpl.schema.sections)) {
          this.registerSchema = tpl.schema;
          this.hasGeneralExtras = this.schemaHasFields('general');
          this.hasTutorExtras = variant === 'adult' ? false : this.schemaHasFields('tutor');
          this.hasChildExtras = this.schemaHasFields('child');
        } else {
          this.registerSchema = null;
          this.hasGeneralExtras = false;
          this.hasTutorExtras = false;
          this.hasChildExtras = false;
        }
      },
      error: () => {
        this.registerSchema = null;
        this.hasGeneralExtras = false;
        this.hasTutorExtras = false;
        this.hasChildExtras = false;
      },
    });
  }

  /** ¿La sección del schema tiene al menos un campo? */
  private schemaHasFields(sectionId: RegisterFormSectionId): boolean {
    const s = this.registerSchema?.sections?.find((x) => x.id === sectionId);
    return !!s && Array.isArray(s.fields) && s.fields.length > 0;
  }

  private initForms(): void {
    this.parentForm = this.fb.group(
      {
        parentesco: [1, Validators.required],
        name: ['', Validators.required],
        surname: ['', Validators.required],
        birthdate: ['', [Validators.required, this.adultValidator.bind(this)]],
        genre: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        confirmEmail: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        password2: ['', Validators.required],
        terms: [false, Validators.requiredTrue],
        comunicaciones: [false],
      },
      {
        validators: [
          this.matchFields('email', 'confirmEmail'),
          this.matchFields('password', 'password2'),
        ],
      },
    );

    this.childrenForm = this.fb.group({
      numHijos: [1, Validators.required],
      hijo1: ['', Validators.required],
      ape1: ['', Validators.required],
      fech1: ['', Validators.required],
      dni1: ['', Validators.required],
    });
  }
  matchFields(field1: string, field2: string) {
    return (formGroup: FormGroup) => {
      const f1 = formGroup.get(field1);
      const f2 = formGroup.get(field2);

      if (!f1 || !f2) return;

      if (f1.value !== f2.value) {
        f2.setErrors({ mismatch: true });
      } else {
        f2.setErrors(null);
      }
    };
  }
  adultValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const birthDate = new Date(control.value);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age >= 18 ? null : { underage: true };
  }

  onSubmitPadre(): void {
    if (this.parentForm.invalid) {
      this.parentForm.markAllAsTouched();
      return;
    }

    if (this.modo === 'email' && this.esPadreAsociadoAJugador) {
      this.pendingConsentAction = 'email';
      this.modalConsentChecked = false;
      this.showConsentModal = true;
      return;
    }

    this.activeTab = 'hijos';
  }

  back() {
    this.activeTab = 'padre';
  }
  toLogin(event?: Event) {
    event?.preventDefault();
    this.router.navigate(['/demo-role']);
  }
  onValidateClick(event: Event, dni: string, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.validateHijo(dni, index);
  }

  updateChildren(): void {
    const total = this.childrenForm.get('numHijos')?.value || 1;

    this.hijosVisibles = Array.from({ length: total }, (_, i) => i);

    // ➕ Añadir controles necesarios
    for (let i = 1; i <= total; i++) {
      this.addChildControls(i);
    }

    // ➖ Eliminar controles sobrantes
    this.removeExtraChildControls(total);
  }
  private removeExtraChildControls(total: number): void {
    const controls = ['hijo', 'ape', 'fech', 'dni', 'team'];

    let index = total + 1;
    while (this.childrenForm.contains(`hijo${index}`)) {
      controls.forEach((control) => {
        this.childrenForm.removeControl(`${control}${index}`);
      });
      index++;
    }
  }

  private addChildControls(index: number): void {
    const controls = ['hijo', 'ape', 'fech'];

    controls.forEach((control) => {
      const controlName = `${control}${index}`;
      if (!this.childrenForm.contains(controlName)) {
        this.childrenForm.addControl(
          controlName,
          this.fb.control('', Validators.required),
        );
      }
    });

    const dniControlName = `dni${index}`;
    if (!this.childrenForm.contains(dniControlName)) {
      const dniControl = this.fb.control('', Validators.required);

      // 🔥 ESCUCHAR CAMBIOS
      dniControl.valueChanges.subscribe(() => {
        // limpiar estado visual
        this.estadoValidacionHijos[index - 1] = undefined;
      });

      this.childrenForm.addControl(dniControlName, dniControl);
    }

    // Equipo del hijo (solo registro por club). Al elegirlo cargamos sus pagos.
    const teamControlName = `team${index}`;
    if (!this.childrenForm.contains(teamControlName)) {
      const validators = this.modo === 'club' ? Validators.required : [];
      const teamControl = this.fb.control('', validators);
      teamControl.valueChanges.subscribe((val) => {
        const teamId = Number(val) || 0;
        if (teamId > 0) this.loadPaymentVariantsForTeam(teamId);
      });
      this.childrenForm.addControl(teamControlName, teamControl);
    }
  }

  // ======================================================
  // FORMULARIO EXTENDIDO DEL CLUB + VARIANTES DE PAGO
  // ======================================================

  /** Carga (perezosa y cacheada) los pagos con variantes de un equipo. */
  private loadPaymentVariantsForTeam(teamId: number): void {
    if (!teamId || teamId <= 0) return;
    if (this.teamPaymentGroups[teamId] || this.loadingTeamIds.has(teamId)) return;
    this.loadingTeamIds.add(teamId);
    this.clubRegisterFormApi.getPagosVariantesRegistroByTeam(this.clubId, teamId).subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.teamPaymentGroups[teamId] = list.filter(
          (g) => g && g.pagoClubId > 0 && Array.isArray(g.variantes),
        );
        this.loadingTeamIds.delete(teamId);
      },
      error: () => {
        this.teamPaymentGroups[teamId] = [];
        this.loadingTeamIds.delete(teamId);
      },
    });
  }

  /** Pagos con variantes a mostrar para un hijo según su equipo. */
  getPaymentGroupsForChild(hijoIndex: number): RegisterPaymentVariantGroup[] {
    const teamId = Number(this.childrenForm?.get('team' + (hijoIndex + 1))?.value) || 0;
    if (teamId <= 0) return [];
    return this.teamPaymentGroups[teamId] || [];
  }

  /** ¿Algún hijo tiene pagos con variantes que mostrar? */
  get hasPaymentVariants(): boolean {
    return this.hijosVisibles.some((i) => this.getPaymentGroupsForChild(i).length > 0);
  }

  /** ¿Hay que pedir tarjeta tras el registro? Sí cuando algún hijo tiene pagos. */
  get requiereTarjetaRegistro(): boolean {
    return this.hasPaymentVariants;
  }

  /** ¿El pago es de precio fijo (sin variantes que elegir)? */
  isFixedPayment(group: RegisterPaymentVariantGroup): boolean {
    return !group?.variantes || group.variantes.length === 0;
  }

  /** ¿El pago tiene un precio base real (>0)? */
  hasBasePrice(group: RegisterPaymentVariantGroup): boolean {
    return this.parseImporte(group?.importe) > 0;
  }

  /** Variante seleccionada por el padre (o null). -1 = precio fijo aceptado. */
  getVariantSelection(hijoIndex: number, pagoClubId: number): number | null {
    const porHijo = this.variantSelections[hijoIndex];
    return porHijo && porHijo[pagoClubId] ? porHijo[pagoClubId] : null;
  }

  /** ¿El padre ha aceptado un pago de precio fijo para este hijo? */
  isFixedAccepted(hijoIndex: number, pagoClubId: number): boolean {
    return this.getVariantSelection(hijoIndex, pagoClubId) === -1;
  }

  /** Registra la elección del padre (un select por pago y por hijo). */
  setVariantSelection(hijoIndex: number, pagoClubId: number, varianteId: any): void {
    this.assignSelection(hijoIndex, pagoClubId, Number(varianteId));
  }

  /** Marca/desmarca la aceptación de un pago de precio fijo. */
  toggleFixedAccept(hijoIndex: number, pagoClubId: number, checked: boolean): void {
    this.assignSelection(hijoIndex, pagoClubId, checked ? -1 : 0);
  }

  private assignSelection(hijoIndex: number, pagoClubId: number, id: number): void {
    if (!this.variantSelections[hijoIndex]) {
      this.variantSelections[hijoIndex] = {};
    }
    this.variantSelections[hijoIndex][pagoClubId] = id;
  }

  /** ¿Falta elegir alguna variante de pago obligatoria en este hijo? */
  isChildVariantMissing(hijoIndex: number): boolean {
    const groups = this.getPaymentGroupsForChild(hijoIndex);
    if (groups.length === 0) return false;
    return groups.some((g) => !this.getVariantSelection(hijoIndex, g.pagoClubId));
  }

  /** ¿Falta la variante de un pago concreto? (aviso bajo el select). */
  isVariantMissing(hijoIndex: number, pagoClubId: number): boolean {
    if (!this.showMissingBanner) return false;
    return this.getPaymentGroupsForChild(hijoIndex).some((g) => g.pagoClubId === pagoClubId)
      && !this.getVariantSelection(hijoIndex, pagoClubId);
  }

  private parseImporte(value: string | null | undefined): number {
    if (value == null) return 0;
    const n = parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  /** Valida todas las secciones dinámicas del formulario del club. */
  private validateAllDynamicSections(): boolean {
    if (!this.dynamicSections) return true;
    let allValid = true;
    for (const cmp of this.dynamicSections.toArray()) {
      if (!cmp.validate()) allValid = false;
    }
    return allValid;
  }

  /** Construye el bloque `answers` del formulario del club para un hijo. */
  private buildDynamicAnswersFor(hijoIndex: number): ClubRegisterFormAnswers | null {
    if (!this.dynamicSections || this.dynamicSections.length === 0) return null;
    const generalCmp = this.dynamicSections.find((c) => c.sectionId === 'general');
    const tutorCmp = this.dynamicSections.find((c) => c.sectionId === 'tutor');
    const childCmp = this.dynamicSections.find(
      (c) => c.sectionId === 'child' && (c.instanceId === hijoIndex || c.instanceId == null),
    );
    const consents = [
      ...(generalCmp ? generalCmp.getConsents() : []),
      ...(tutorCmp ? tutorCmp.getConsents() : []),
      ...(childCmp ? childCmp.getConsents() : []),
    ];
    const answers: ClubRegisterFormAnswers = {};
    if (generalCmp) answers.general = generalCmp.getValues();
    if (tutorCmp) answers.tutor = tutorCmp.getValues();
    if (childCmp) answers.child = childCmp.getValues();
    if (consents.length > 0) answers.consents = consents;
    return answers;
  }

  // 🔹 NUEVA FUNCIÓN: valida TODOS los DNIs
  private async validarTodosLosHijos(): Promise<boolean> {
    const requests = this.hijosVisibles.map((index) => {
      const dni = this.childrenForm.get('dni' + (index + 1))?.value;

      if (!dni) {
        this.estadoValidacionHijos[index] = false;
        return Promise.resolve();
      }

      return this.registerService
        .checkPlayerForDni(dni)
        .toPromise()
        .then((res) => {
          // true = DNI libre (NO existe)
          // false = DNI duplicado (EXISTE)
          this.estadoValidacionHijos[index] = res?.data === true;
        })
        .catch(() => {
          this.estadoValidacionHijos[index] = false;
        });
    });

    await Promise.all(requests);

    // ❗ Si TODOS son true → válido
    return this.estadoValidacionHijos.every((v) => v === true);
  }

  validateHijo(dni: string, index: number): void {
    if (!dni || dni.trim() === '') {
      alert('Debes introducir la identificación antes de validarlo.');
      return;
    }
    this.registerService.checkPlayerForDni(dni).subscribe({
      next: (res) => {
        this.estadoValidacionHijos[index] = res?.data === true;
      },
      error: () => {
        this.estadoValidacionHijos[index] = false;
      },
    });
  }
  async finish(): Promise<void> {
    const text =
      this.hijosVisibles.length === 1
        ? '1 hijo.'
        : `${this.hijosVisibles.length} hijos.`;

    const confirmacion = confirm(
      `Vas a crear ${text} Si esto es correcto, dale a confirmar.`,
    );

    if (!confirmacion) return;

    if (this.parentForm.invalid || this.childrenForm.invalid) {
      this.parentForm.markAllAsTouched();
      this.childrenForm.markAllAsTouched();
      return;
    }

    // Formulario extendido del club (secciones tutor/general/child por hijo).
    const dynamicOk = this.validateAllDynamicSections();
    // Variantes de pago obligatorias cuando el equipo del hijo tiene pagos.
    const variantsOk = !this.hijosVisibles.some((i) => this.isChildVariantMissing(i));
    if (!dynamicOk || !variantsOk) {
      this.showMissingBanner = true;
      return;
    }
    this.showMissingBanner = false;

    this.isLoading = true;

    const hijosValidos = await this.validarTodosLosHijos();

    if (!hijosValidos) {
      this.isLoading = false;
      alert('🚫 Uno o más jugadores ya existen en el sistema.');
      return;
    }

    this.isLoading = false;
    this.pendingConsentAction = 'club';
    this.modalConsentChecked = false;
    this.showConsentModal = true;
  }

  confirmConsent(): void {
    if (!this.modalConsentChecked) return;

    this.showConsentModal = false;
    this.showConsentWarning = false;

    if (this.pendingConsentAction === 'club') {
      this.doRegistrarClub(1);
    } else if (this.pendingConsentAction === 'email') {
      this.doRegistrarEmail(1);
    }
  }

  closeConsentModal(): void {
    this.showConsentModal = false;
    this.modalConsentChecked = false;
    this.showConsentWarning = false;
    this.isLoading = false;
  }

  declineConsent(): void {
    this.showConsentWarning = true;
  }

  backToConsent(): void {
    this.showConsentWarning = false;
  }

  confirmNoConsent(): void {
    this.showConsentModal = false;
    this.showConsentWarning = false;
    this.modalConsentChecked = false;

    if (this.pendingConsentAction === 'club') {
      this.doRegistrarClub(0);
    } else if (this.pendingConsentAction === 'email') {
      this.doRegistrarEmail(0);
    }
  }

  private doRegistrarClub(consentimientoIA: 0 | 1 = 1): void {
    this.isLoading = true;

    const padreData = {
      parentesco: this.parentForm.get('parentesco')?.value,
      firstName: this.parentForm.get('name')?.value,
      secondName: this.parentForm.get('surname')?.value,
      birthdate: this.parentForm.get('birthdate')?.value,
      genre: this.parentForm.get('genre')?.value,
      mail: this.parentForm.get('email')?.value,
      mobile: this.parentForm.get('phone')?.value,
      password: this.parentForm.get('password')?.value,
      comunicaciones: this.parentForm.get('comunicaciones')?.value ? 1 : 0,
      consentimientoIA,
      clubId: this.clubId,
    };

    const hijosData = this.hijosVisibles.map((index) => ({
      nombre: this.childrenForm.get('hijo' + (index + 1))?.value,
      apellidos: this.childrenForm.get('ape' + (index + 1))?.value,
      fechaNacimiento: this.childrenForm.get('fech' + (index + 1))?.value,
      dni: this.childrenForm.get('dni' + (index + 1))?.value,
    }));

    this.registerService
      .registerPadreHijos({ padre: padreData, hijos: hijosData })
      .subscribe({
        next: () => {
          this.persistClubFormAndVariants();
          this.isLoading = false;
          this.snackBar.open('Registro exitoso.', 'Cerrar', { duration: 5000 });
          this.autoLoginThenSuccess();
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error al registrar.', 'Cerrar', { duration: 5000 });
        },
      });
  }

  /**
   * Guarda (en demo, simulado) las respuestas del formulario extendido del
   * club y las variantes de pago elegidas por hijo. Fire-and-forget.
   */
  private persistClubFormAndVariants(): void {
    if (this.modo !== 'club' || this.clubId <= 0) return;

    // Respuestas del formulario dinámico (una por hijo).
    for (const index of this.hijosVisibles) {
      const answers = this.buildDynamicAnswersFor(index);
      if (answers) {
        this.clubRegisterFormApi
          .saveResponse({ clubId: this.clubId, userId: 0, answers, variant: 'minor' })
          .subscribe({ next: () => {}, error: () => {} });
      }
    }

    // Selección de variantes de pago por hijo.
    const selecciones = this.hijosVisibles.flatMap((index) => {
      const porHijo = this.variantSelections[index] || {};
      return Object.keys(porHijo)
        .map((k) => Number(k))
        .filter((pagoClubId) => porHijo[pagoClubId] > 0)
        .map((pagoClubId) => ({
          pagoClubId,
          playerId: 8001 + index,
          varianteId: porHijo[pagoClubId],
        }));
    });
    if (selecciones.length > 0) {
      this.clubRegisterFormApi
        .saveSeleccionVariantesRegistro({ clubId: this.clubId, selecciones })
        .subscribe({ next: () => {}, error: () => {} });
    }
  }

  /**
   * Auto-login (para dejar sesión iniciada) y luego navega a la pantalla de
   * éxito `/registro-padres/exito` (paridad con producción).
   */
  private autoLoginThenSuccess(): void {
    const email = this.parentForm.get('email')?.value;
    const password = this.parentForm.get('password')?.value;
    if (!email || !password) {
      this.goSuccessScreen(false);
      return;
    }
    const login = new LoginModel(email.trim(), password.trim());
    this.loginService.login(login).subscribe({
      next: (res) => this.goSuccessScreen(!!res?.data),
      error: () => this.goSuccessScreen(false),
    });
  }

  /** Navega a la pantalla de éxito con las listas de hijos y flags de pago. */
  private goSuccessScreen(autoLoginOk: boolean): void {
    const pideTarjeta = this.requiereTarjetaRegistro;
    const children = this.hijosVisibles
      .map((index) => ({
        playerId: 8001 + index,
        teamId: Number(this.childrenForm.get('team' + (index + 1))?.value) || 0,
        nombre: `${this.childrenForm.get('hijo' + (index + 1))?.value ?? ''} `
          + `${this.childrenForm.get('ape' + (index + 1))?.value ?? ''}`.trim(),
      }))
      .filter((c) => c.teamId > 0);

    const playerIds = children.map((c) => c.playerId).join(',');
    const teamIds = children.map((c) => c.teamId).join(',');
    const childNames = children.map((c) => encodeURIComponent(c.nombre || '')).join(',');

    this.router.navigate(['/registro-padres/exito'], {
      queryParams: {
        clubId: this.clubId || undefined,
        autoLoginOk: autoLoginOk ? '1' : '0',
        pedirTarjeta: pideTarjeta && children.length > 0 ? '1' : undefined,
        teamId: pideTarjeta && children.length > 0 ? children[0].teamId : undefined,
        playerId: pideTarjeta && children.length > 0 ? children[0].playerId : undefined,
        playerIds: pideTarjeta && children.length > 0 ? playerIds : undefined,
        teamIds: pideTarjeta && children.length > 0 ? teamIds : undefined,
        childNames: pideTarjeta && children.length > 0 ? childNames : undefined,
      },
    });
  }

  private doRegistrarEmail(consentimientoIA: 0 | 1 = 1): void {
    this.isLoading = true;

    const padreData = {
      parentesco: this.parentForm.get('parentesco')?.value,
      firstName: this.parentForm.get('name')?.value,
      secondName: this.parentForm.get('surname')?.value,
      birthdate: this.parentForm.get('birthdate')?.value,
      genre: this.parentForm.get('genre')?.value,
      mail: this.parentForm.get('email')?.value,
      mobile: this.parentForm.get('phone')?.value,
      password: this.parentForm.get('password')?.value,
      comunicaciones: this.parentForm.get('comunicaciones')?.value ? 1 : 0,
      consentimientoIA,
      clubId: 0,
      playerId: this.playerId,
    };

    this.registerService
      .registerPadreHijos({ padre: padreData, hijos: [{}] })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Registro exitoso.', 'Cerrar', { duration: 5000 });
          this.autoLogin();
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error al registrar.', 'Cerrar', { duration: 5000 });
        },
      });
  }

  private autoLogin(): void {
    const email = this.parentForm.get('email')?.value;
    const password = this.parentForm.get('password')?.value;
    if (!email || !password) {
      console.warn('No se puede hacer login automático: faltan credenciales');
      return;
    }
    const login = new LoginModel(email.trim(), password.trim());
    this.loginService.login(login).subscribe({
      next: (res) => {
        if (res.data) {
          this.router.navigate(['/dashboard/inicio']);
        } else {
          this.router.navigate(['/demo-role']);
        }
      },
      error: () => {
        this.router.navigate(['/demo-role']);
      },
    });
  }
  toggleLangDropdown(event: Event) {
    event.stopPropagation();
    this.showLangDropdown = !this.showLangDropdown;
  }

  selectLang(lang: string) {
    this.selectedLang = lang;
    this.cambiarIdioma();
    this.showLangDropdown = false;
  }

  // 👉 MISMA lógica que el header
  cambiarIdioma() {
    localStorage.setItem('lang', this.selectedLang);
    this.translate.use(this.selectedLang);
  }

  // Opcional: cerrar al hacer click fuera
  @HostListener('document:click')
  closeLangDropdown() {
    this.showLangDropdown = false;
  }
  trackByIndex(index: number): number {
    return index;
  }
}
