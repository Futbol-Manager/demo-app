import { Component, HostListener, OnInit } from '@angular/core';
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
      }
    });
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
    const controls = ['hijo', 'ape', 'fech', 'dni'];

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
