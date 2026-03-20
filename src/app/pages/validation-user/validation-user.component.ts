import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RegisterService } from 'src/app/core/services/register/register.service';

type ValidationStatus = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-validation-user',
  templateUrl: './validation-user.component.html',
  styleUrls: ['./validation-user.component.scss'],
})
export class ValidationUserComponent implements OnInit {
  status: ValidationStatus = 'idle';
  errorMessage: string = 'No se ha podido validar el usuario. Inténtalo de nuevo.';

  private userId: number = 0;

  constructor(
    private router: Router,
    private registerService: RegisterService,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.userId = +params['userId'] || 0;
    });
  }

  validarUsuario(): void {
    this.status = 'loading';

    this.registerService.validateUser(this.userId).subscribe({
      next: (res) => {
        if (res.data) {
          this.status = 'success';
        } else {
          this.errorMessage = 'No se ha podido validar el usuario. Inténtalo de nuevo.';
          this.status = 'error';
        }
      },
      error: () => {
        this.errorMessage = 'Error de conexión. Por favor, inténtalo más tarde.';
        this.status = 'error';
      },
    });
  }

  goHome(): void {
    this.router.navigate(['/demo-role']);
  }

  reset(): void {
    this.status = 'idle';
  }
}
