import { Component, EventEmitter, Input, OnInit, Output, Inject, ElementRef, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-clubes-list',
  templateUrl: './clubes-list.component.html',
  styleUrls: ['./clubes-list.component.scss']
})
export class ClubesListComponent implements OnInit {

  @Input() clubes: any[] = []; // Lista de todos los clubes
  @Output() clubSeleccionadoChange = new EventEmitter<any>(); // Evento para enviar el club seleccionado al componente padre
  @ViewChild('listaCompleta') listaCompletaRef!: ElementRef<HTMLDivElement>;
  @ViewChild('listaFiltrada') listaFiltradaRef!: ElementRef<HTMLDivElement>;

  filtro: string = '';
  clubesFiltrados: any[] = [];
  clubSeleccionado: any = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.clubes = data.clubes;
  }

  ngOnInit(): void {
  }

  /*filtrarClubes() {
    this.clubesFiltrados = this.clubes.filter(club =>
      club.name.toLowerCase().includes(this.filtro.toLowerCase())
    );
  }*/

  filtrarClub(): void {
    // Lógica para filtrar los clubes según algún criterio
    // Aquí solo agregamos un ejemplo simple de filtro
    //this.clubesFiltrados = this.clubes.filter(club => /* Aquí va tu condición de filtro */);

    // Verificamos que los elementos existan antes de manipularlos
    if (this.listaCompletaRef && this.listaFiltradaRef) {
      this.listaCompletaRef.nativeElement.style.display = 'none';
      this.listaFiltradaRef.nativeElement.style.display = 'block';
    }
  }

  /*seleccionarClub(club?: any) {
    if (club === this.clubSeleccionado) {
      // Si el club actual ya está seleccionado, lo deseleccionamos
      this.clubSeleccionado = null;
    } else {
      // Si no está seleccionado, lo seleccionamos
      this.clubSeleccionado = club;
    }
    // Emitimos el club seleccionado al componente padre
    this.clubSeleccionadoChange.emit(this.clubSeleccionado);
  }*/

  seleccionarClub(club?: any) {
    this.clubSeleccionadoChange.emit(club);
}

  filtrarClubes() {
    this.clubesFiltrados = this.clubes.filter(club =>
      club.name.toLowerCase().includes(this.filtro.toLowerCase())
    );

    // Verificamos que los elementos existan antes de manipularlos
    if (this.listaCompletaRef && this.listaFiltradaRef) {
      this.listaCompletaRef.nativeElement.style.display = 'none';
      this.listaFiltradaRef.nativeElement.style.display = 'block';
    }
  }
}
