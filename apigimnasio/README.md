# Backend - Gestor de Actividades (GimnasioOrto API)

API REST desarrollada con Node.js + Express que gestiona usuarios, actividades deportivas y reservas.
Incluye autenticacion con JWT, control de acceso por roles, validaciones de negocio y tareas programadas con Inngest.

## Tecnologias
- Lenguaje: JavaScript (ES Modules)
- Runtime: Node.js
- Framework: Express 5.2.1
- Base de datos: MongoDB Atlas (driver oficial `mongodb` 7.0.0)
- Seguridad: JWT (`jsonwebtoken`) + BCrypt (`bcrypt`)
- Validacion: validaciones manuales en controladores
- Automatizacion: Inngest 3.50.0 (cron)
- Integraciones: Telegram Bot API
- Build/ejecucion: npm

## Ejecucion

### Requisitos previos
- Node.js 18 o superior
- MongoDB Atlas
- Variables de entorno configuradas

### Variables de entorno necesarias
```env
PORT=
DB_NAME=
MONGO_URI=
JWT_SECRET=
ACCESS_TOKEN_TTL=
BCRYPT_SALT_ROUNDS=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### Arranque
```bash
cd apigimnasio
npm install
npm start
```

## Modelo de datos (MongoDB Atlas)

### `usuarios`
- `_id` (ObjectId)
- `nombre` (String)
- `apellido` (String)
- `correo` (String) - unico (indice unico en DB)
- `telefono` (String) - opcional
- `contrasenaHash` (String) - hash BCrypt
- `rol` (String) - `cliente` por defecto

### `actividades`
- `_id` (ObjectId)
- `nombre` (String)
- `foto` (String)
- `descripcion` (String)
- `dia` (String)
- `hora` (String)
- `maximoPersonas` (Number | null)
- `createdAt` (Date)
- `updatedAt` (Date, solo en actualizaciones)

### `reservas`
- `_id` (ObjectId)
- `actividadId` (ObjectId)
- `usuarioId` (String, `sub` del JWT)
- `createdAt` (Date)

## Endpoints

### Salud
- `GET /ping` - estado basico de API + DB

### Autenticacion y usuarios
- `POST /usuarios` - registro de usuario
- `POST /auth/login` - login y entrega de `accessToken`

### Actividades (`authRequired`)
- `GET /actividades` - listar actividades con `reservasCount` y `llena`
- `GET /actividades/{id}` - detalle de actividad con conteo de reservas
- `POST /actividades` - crear (solo `admin`)
- `PUT /actividades/{id}` - actualizar (solo `admin`)
- `DELETE /actividades/{id}` - eliminar (solo `admin`)

### Reservas (`authRequired`)
- `GET /reservas` - listar reservas del usuario autenticado
- `POST /reservas` - crear reserva (`actividadId`)
- `DELETE /reservas` - cancelar reserva (`actividadId`)

### Inngest
- `POST /api/inngest` - endpoint de funciones Inngest

## Reglas de negocio

### Usuarios
- `correo` debe ser unico (error `409` en duplicado).
- `contrasena` minima de 8 caracteres en registro.
- La contrasena se guarda hasheada con BCrypt.
- Rol por defecto: `cliente`.

### Actividades
- `nombre` y `descripcion` son obligatorios para crear/editar.
- `maximoPersonas`, si se envia, debe ser numero valido mayor a 0.
- Solo `admin` puede crear, editar o eliminar.

### Reservas
- No se permite reservar dos veces la misma actividad por el mismo usuario.
- Si la actividad tiene `maximoPersonas`, no se puede superar la capacidad.
- Al cancelar, se elimina la reserva del usuario para esa actividad.

## Seguridad
- Autenticacion: Bearer token JWT en header `Authorization`.
- Middleware `authRequired` para rutas protegidas.
- Estados de token:
  - `AUTH_REQUIRED` si falta token
  - `TOKEN_EXPIRED` si expiro
  - `INVALID_TOKEN` si es invalido
- El login devuelve usuario seguro sin `contrasenaHash`.

## Manejo de errores
- Respuestas JSON uniformes con `ok: false` y `mensaje`.
- En rutas de autenticacion tambien se usa `code` para clasificar errores de token.
- Codigos HTTP usados: `400`, `401`, `403`, `404`, `409`, `500`.

## Tareas programadas
La funcion `revisionActividadCadaHora` se publica via Inngest y actualmente usa cron `*/1 * * * *`:

- Ejecuta un recordatorio automatico via Telegram.
- Mensaje: revision de actividad del gimnasio.

Nota: por nombre parece "cada hora", pero la expresion cron actual ejecuta cada minuto.
