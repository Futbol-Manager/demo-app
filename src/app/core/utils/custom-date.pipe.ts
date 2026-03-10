import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'customDate'
})
export class CustomDatePipe implements PipeTransform {
  transform(value: string): string {
    const partes = value.split('-');
    const fechaObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    
    const dia = fechaObj.getDate();
    const mes = fechaObj.getMonth() + 1;
    const año = fechaObj.getFullYear();
    
    const diaStr = dia < 10 ? '0' + dia : dia.toString();
    const mesStr = mes < 10 ? '0' + mes : mes.toString();
    
    return `${diaStr}/${mesStr}/${año}`;
  }
}
