# Move & Lite — API + Front (Registro/Login)

Proyecto con **frontend en Vue** (registro/login) y **backend en Node/Express** conectado a **MongoDB Atlas**.  
Cuando un usuario se registra, el backend también envía una **notificación por Telegram**.

---

## 📌 Tecnologías

**Backend**
- Node.js + Express
- MongoDB Atlas (driver oficial `mongodb`)
- bcrypt (hash de contraseñas)
- CORS
- dotenv
- Inngest (endpoint `/api/inngest`)
- Telegram (notificación al registrar)

**Frontend**
- Vue 3 
- Fetch API

---

## 📷 Capturas

> Acá pegá tus imágenes

- Pantalla de registro: `./docs/registro.png`
- Pantalla de login: `./docs/login.png`
- Notificación Telegram: `./docs/telegram.png`

---

# Notificación por Telegram (Registro de Usuarios)

Este proyecto envía una **notificación automática por Telegram** cada vez que se crea un usuario nuevo desde el endpoint:

- **POST** `/usuarios`

La notificación **NO se envía desde el frontend** (Vue).  
El frontend solo hace un `fetch` al backend, y **el backend** (Node/Express) es quien manda el mensaje a Telegram.

---

## ✅ ¿Dónde se envía el mensaje?

En el backend, dentro del endpoint:




