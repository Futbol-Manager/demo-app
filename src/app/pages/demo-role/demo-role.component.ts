import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { DemoService, DemoRole } from 'src/app/core/services/demo/demo.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';

@Component({
  selector: 'app-demo-role',
  templateUrl: './demo-role.component.html',
  styleUrls: ['./demo-role.component.scss'],
})
export class DemoRoleSelectionComponent implements OnInit {
  /** Logo claro para fondo navy Sphaira */
  get logoSrc(): string {
    return 'assets/images/logosphairaw.png';
  }

  constructor(
    private router: Router,
    private loginService: LoginService,
    private demoService: DemoService,
    private tutorialService: TutorialService,
  ) {}

  /** Abre el tutorial guiado de esta pantalla. */
  openTutorial(): void {
    this.tutorialService.start('demo-role', true);
  }

  ngOnInit(): void {
    if (!this.demoService.isDemoMode()) {
      this.router.navigate(['/dashboard/inicio']);
      return;
    }
    const role = this.demoService.getDemoRole();
    if (role) {
      this.navigateByRole(role);
      return;
    }
    // Tutorial automático al mostrar la pantalla de selección de rol demo
    setTimeout(() => this.openTutorial(), 600);
  }

  selectRole(role: DemoRole): void {
    this.loginService.setDemoUserAndNavigate(role);
  }

  private navigateByRole(role: DemoRole): void {
    // Los 3 roles usan la misma ruta inicial; el contenido depende del rol (profileId).
    this.router.navigate(['/dashboard/inicio']);
  }
}
