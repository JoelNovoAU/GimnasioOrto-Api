# Auth con JWT (Login / Registro) — Node.js + Express

Este proyecto implementa autenticación usando:

- **bcrypt** para hashear contraseñas .
- **JWT (JSON Web Token)** para manejar sesiones mediante un access token.

## Instalación:

```
npm install express bcrypt jsonwebtoken dotenv
```

---

## Variables de Entorno

Crear un archivo `.env`

### Estuctura para coger token chat id
![Pantalla de registro](ImgReadme/imagen1bcrypt)

### Explicación

- **BCRYPT_SALT_ROUNDS** → Nivel de seguridad del hash .
- **JWT_SECRET** → Clave secreta para firmar el token.
- **ACCESS_TOKEN_TTL** → Tiempo de vida del token.

Lectura en el código:

```js
const BCRYPT_SALT_ROUNDS = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
const JWT_SECRET = String(process.env.JWT_SECRET || "").trim();
const ACCESS_TOKEN_TTL = String(process.env.ACCESS_TOKEN_TTL || "").trim();
```

---

# Registro de Usuario con bcrypt

Durante el registro:

1. Se genera un salt.
2. Se hashea la contraseña.
3. Se guarda el usuario con `contrasenaHash`.



```js
const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
const contrasenaHash = await bcrypt.hash(contrasena, salt);

const nuevoUsuario = {
  nombre: String(nombre).trim(),
  apellido: String(apellido).trim(),
  correo: String(correo).trim().toLowerCase(),
  telefono: telefono ? String(telefono).trim() : "",
  contrasenaHash,
  rol: "cliente",
};
```

# Login de Usuario y Generación del Access Token

Durante el login:

1. Se busca el usuario por correo.
2. Se compara la contraseña ingresada con el hash guardado.

```js
const ok = await bcrypt.compare(String(contrasena), user.contrasenaHash);

if (!ok) {
  return res.status(401).json({
    ok: false,
    mensaje: "Credenciales inválidas"
  });
}
```

Si la contraseña es correcta, se genera el token.



La función `toSafeUser()` elimina datos sensibles como `contrasenaHash` antes de enviar el usuario al cliente.

---
