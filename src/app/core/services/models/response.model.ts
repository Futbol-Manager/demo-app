// error.model.ts

export class Error {
    code!: number;
    msg!: string;
  
    constructor(object: any | null) {
      if (object) {
        this.code = (object.code) ? object.code : null;
        this.msg = (object.msg) ? object.msg : null;
      }
    }
  }
  
  // response.model.ts
  
  export class Response {
    error: Error;
    data: any; // Puedes cambiar el tipo según la estructura real de los datos
    status: number;
  
    constructor(object: any) {
      this.error = new Error(object.error);
      this.data = object.data;
      this.status = (object.status) ? object.status : null;
    }
  }
  