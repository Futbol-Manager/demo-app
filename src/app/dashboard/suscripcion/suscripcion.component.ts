import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-suscripcion',
  templateUrl: './suscripcion.component.html',
  styleUrls: ['./suscripcion.component.scss']
})
export class SuscripcionComponent implements OnInit {

  userId = 0;
  selected = 0;
  constructor(
    private route: ActivatedRoute,) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.userId = params['userId'];
      //console.log('this.playerID =' + this.playerID + 'y this.emailParam =' + this.emailParam);
    });
  }

  select(option: number){
    
  }

}
