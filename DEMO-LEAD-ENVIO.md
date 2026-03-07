# Demo app – Envío de correo/lead y tabla en API

## Flujo del “correo” en demo

En la **demo** no se envía un email SMTP al usuario. Lo que hace la app es:

1. **Login demo**: el usuario introduce solo su **email** y entra sin backend (login 100% local).
2. **Al cerrar sesión** (o por inactividad), la app envía ese **email + actividad** al API (lead) para guardarlo y poder usarlo luego para notificaciones por email con IA.

### Dónde se envía

- **Servicio**: `demo-app/src/app/core/services/demo/demo-activity.service.ts`  
  Método: `submitLead(email: string)`.
- **Llamada**: se hace desde `LoginService.cerrarSesion()` cuando `demoService.isDemoMode()` es true (ver `demo-app/src/app/core/services/login/login.service.ts`).

### Endpoint del API

- **URL**: `POST {baseUrl}/public/demo-lead`
- **Controller**: `api-futbol-manager/manager/.../controller/PublicController.java`  
  Método: `saveDemoLead(@RequestBody DemoLeadRequestDTO dto)`.
- **Ruta completa** (con `context-path=/api`):  
  `POST http://localhost:8081/api/rest/public/demo-lead`

### Body del request (ejemplo)

```json
{
  "email": "usuario@ejemplo.com",
  "demoRole": "coach",
  "activitySummary": {
    "totalSeconds": 120,
    "visits": [ { "route": "inicio", "seconds": 60 }, { "route": "equipos", "seconds": 60 } ],
    "topScreens": [ { "route": "inicio", "seconds": 60 }, { "route": "equipos", "seconds": 60 } ]
  }
}
```

---

## Tabla donde se guarda la información

- **Base de datos**: la que use el API (p. ej. `futbol_manager2` en `application.properties`).
- **Tabla**: **`demo_lead`**
- **Script SQL**: `api-futbol-manager/sql/demo_lead_table.sql`
- **Entidad JPA**: `api-futbol-manager/manager/.../entity/DemoLeadEntity.java`  
  `@Table(name = "demo_lead")`

### Estructura de la tabla `demo_lead`

| Columna         | Tipo         | Descripción                                      |
|-----------------|-------------|--------------------------------------------------|
| `id`            | BIGINT PK   | Auto-increment                                   |
| `email`         | VARCHAR(255)| Email del usuario (obligatorio)                  |
| `demo_role`     | VARCHAR(20) | Rol en la demo: club, coach, player              |
| `activity_json` | TEXT        | JSON con visits, topScreens, totalSeconds         |
| `created_at`    | DATETIME    | Fecha de creación (default CURRENT_TIMESTAMP)   |

Índices: `idx_demo_lead_email`, `idx_demo_lead_created`.

---

## Cómo verificar con la API levantada

1. **Levantar el API** (api-futbol-manager), por ejemplo:
   ```bat
   cd d:\SphairaTech\WEB\api-futbol-manager
   set MAIL_USERNAME=support@appsphairatech.com
   set MAIL_PASSWORD=...
   start-backend-dev.bat
   ```
   O con Maven: `cd manager && mvnw.cmd spring-boot:run`  
   El API queda en **http://localhost:8081** (puerto en `application.properties`).

2. **Probar el endpoint con curl**:
   ```bash
   curl -X POST "http://localhost:8081/api/rest/public/demo-lead" ^
     -H "Content-Type: application/json" ^
     -d "{\"email\":\"test@verificacion.com\",\"demoRole\":\"coach\",\"activitySummary\":{\"totalSeconds\":10,\"visits\":[],\"topScreens\":[]}}"
   ```
   Respuesta esperada (200): body con `"status":200` y mensaje de éxito.

3. **Probar desde la demo app**:
   - Arrancar la demo apuntando al API local:  
     `ng serve --configuration=demo-local`
   - Entrar con un email, navegar un poco y cerrar sesión.
   - El lead se envía a `http://localhost:8081/api/rest/public/demo-lead`.

4. **Comprobar en base de datos**:
   ```sql
   SELECT * FROM demo_lead ORDER BY created_at DESC LIMIT 10;
   ```

---

## Configuración de la URL del lead en demo-app

| Configuración    | Uso                         | URL del lead (demoLeadApiUrl)                    |
|------------------|-----------------------------|--------------------------------------------------|
| **`demo`**       | Desarrollo local            | `https://appsphairatech.com/api/rest` (API prod) |
| **`demo-local`** | Probar envío con API local  | `http://localhost:8081/api/rest`                 |
| **`demo-deploy`**| **Desplegar en demo.sphairatech.com** | `https://demo.sphairatech.com/api/rest` (API de demo) |

Para verificar en local usa **demo-local**.  
**Para subir a demo.sphairatech.com usa siempre `demo-deploy`** (ver sección Seguridad abajo).

---

## Seguridad: demo desplegada sin tocar producción

**Problema:** Si al desplegar en demo.sphairatech.com usas la configuración **`demo`**, la app sigue enviando los leads a la **API de producción** (`appsphairatech.com`), que escribe en la **misma base de datos** que producción. No es seguro.

**Solución:** Usar una **API y base de datos dedicadas para la demo**:

1. **Build para demo.sphairatech.com** con la configuración **`demo-deploy`**:
   ```bash
   ng build --configuration=demo-deploy
   ```
   Así la app desplegada envía los leads a **`APIURLDEMO`** (por defecto `https://demo.sphairatech.com/api/rest`), no a producción.

2. **Desplegar una instancia del API** (api-futbol-manager) que:
   - Esté accesible en la URL que uses como `APIURLDEMO` (p. ej. `https://demo.sphairatech.com` si API y front comparten dominio).
   - Use una **base de datos distinta** a la de producción (p. ej. `futbol_manager_demo` o `demo`), configurada en su `application.properties` / variables de entorno.
   - Tenga la tabla `demo_lead` creada (mismo script `sql/demo_lead_table.sql` o JPA con `ddl-auto=update`).

3. **Cambiar la URL de la API de demo** si usas otro dominio o puerto: edita `src/app/core/models/master/masters.enum.ts` y ajusta:
   ```ts
   export const APIURLDEMO = 'https://demo.sphairatech.com'  // o la URL de tu API de demo
   ```

Resumen: **https://demo.sphairatech.com** (front) → **API de demo** (mismo dominio o APIURLDEMO) → **Base de datos de demo**. La base de datos de producción no se usa.
