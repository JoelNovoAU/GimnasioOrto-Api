<script setup>
import { ref } from "vue";

import Principal from "./principal.vue"; 
import CrearCuenta from "./CrearCuenta.vue"; 


const vista = ref("login"); 

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);

const errorMsg = ref("");
const emailEl = ref(null);
const passEl = ref(null);

const irACrearCuenta = () => {
  errorMsg.value = "";
  vista.value = "crear";
};

const volverAlLogin = () => {
  errorMsg.value = "";
  vista.value = "login";
  requestAnimationFrame(() => emailEl.value?.focus());
};

const onSubmit = async () => {
  errorMsg.value = "";
  loading.value = true;

  try {
    const resp = await fetch("http://localhost:3000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: email.value,
        contrasena: password.value,
      }),
    });

    const raw = await resp.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { mensaje: raw || "Respuesta no válida del servidor" };
    }

    if (!resp.ok) {
      errorMsg.value = data?.mensaje || "Credenciales inválidas";
      requestAnimationFrame(() => passEl.value?.focus());
      return;
    }

    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    vista.value = "principal";
  } catch (e) {
    console.error("Error login:", e);
    errorMsg.value = "Error de conexión con la API";
    requestAnimationFrame(() => emailEl.value?.focus());
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Principal v-if="vista === 'principal'" />

  <CrearCuenta v-else-if="vista === 'crear'" @volver="volverAlLogin" />

  <div v-else class="autenticacion">
    <div class="autenticacion__fondo" aria-hidden="true"></div>
    <main class="autenticacion__contenedor">
      <section class="marca" aria-label="Move & Lite">
        <div class="marca__encabezado">
          <div class="marca__logo" title="Logo">
            <img
              src="./assets/logo.png"
              alt="Logo del gimnasio"
              class="marca__logoImagen"
            />
            <div class="marca__logoRespaldo">
              <span>GO</span>
            </div>
          </div>

          <div class="marca__titulo">
            <h1>Move & Lite</h1>
          </div>
        </div>

        <div class="marca__estadisticas">
          <div class="estadistica">
            <span class="estadistica__etiqueta">Energía</span>
            <span class="estadistica__barra"><i style="width: 86%"></i></span>
          </div>
          <div class="estadistica">
            <span class="estadistica__etiqueta">Progreso</span>
            <span class="estadistica__barra"><i style="width: 72%"></i></span>
          </div>
          <div class="estadistica">
            <span class="estadistica__etiqueta">Constancia</span>
            <span class="estadistica__barra"><i style="width: 91%"></i></span>
          </div>
        </div>

        <div class="marca__pie">
          <span class="punto"></span>
          <span>Seguridad y rendimiento para tu operación diaria</span>
        </div>
      </section>

      <section class="panel" aria-label="Iniciar sesión">
        <header class="panel__encabezado">
          <h2>Iniciar sesión</h2>
          <p>Ingresá tus credenciales para continuar.</p>
        </header>

        <form class="formulario" @submit.prevent="onSubmit">
          <label class="campo">
            <span class="campo__etiqueta">Correo</span>
            <div class="campo__control">
              <input
                ref="emailEl"
                v-model.trim="email"
                type="email"
                autocomplete="email"
                placeholder="tu@correo.com"
                required
              />
              <span class="campo__icono" aria-hidden="true">✉</span>
            </div>
          </label>

          <label class="campo">
            <span class="campo__etiqueta">Contraseña</span>
            <div class="campo__control">
              <input
                ref="passEl"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>
          </label>

          <button class="boton" type="submit" :disabled="loading">
            <span v-if="!loading">Entrar</span>
            <span v-else class="spinner" aria-label="Cargando"></span>
          </button>

          <p v-if="errorMsg" class="mensajeError">{{ errorMsg }}</p>

          <div class="crear">
            <span class="crear__texto">¿No tienes cuenta?</span>
            <a class="crear__enlace" href="#" @click.prevent="irACrearCuenta">
              Crear cuenta
            </a>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>



<style scoped>
:root {
  --c-1: #323232;
  --c-2: #2cb8af;
  --c-3: #222222;

  --texto: rgba(255, 255, 255, 0.92);
  --atenuado: rgba(255, 255, 255, 0.68);
  --suave: rgba(255, 255, 255, 0.10);
  --suave2: rgba(255, 255, 255, 0.14);
  --sombra: 0 18px 60px rgba(0, 0, 0, 0.55);
}

* { box-sizing: border-box; }

.autenticacion{
  min-height:100vh;
  display:grid;
  place-items:center;
  padding:40px;
  position:relative;
  overflow:hidden;

  background-image: url(./imagenes/fondo3.webp);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.autenticacion__fondo {
  position: absolute;
  inset: -2px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 12px),
    linear-gradient(315deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 14px);
  background-size: 22px 22px;
  filter: blur(0.2px);
  opacity: 0.65;
  pointer-events: none;
}

.autenticacion__contenedor {
  width: min(1060px, 100%);
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: var(--sombra);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
  backdrop-filter: blur(10px);
}

.marca {
  padding: 34px 34px 28px;
  background:
    radial-gradient(900px 500px at 10% 20%, rgba(44, 184, 175, 0.18), transparent 58%),
    linear-gradient(180deg, rgba(50,50,50,0.55), rgba(34,34,34,0.85));
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.marca__encabezado {
  display: flex;
  align-items: center;
  gap: 16px;
}

.marca__logo {
  width: 94px;
  height: 94px;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(44,184,175,0.22), rgba(255,255,255,0.06));
  border: 1px solid rgba(44, 184, 175, 0.32);
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
}

.marca__logo::after {
  content: "";
  position: absolute;
  inset: -40%;
  background: radial-gradient(circle, rgba(44,184,175,0.35), transparent 60%);
  transform: rotate(25deg);
  opacity: 0.9;
}

.marca__logoImagen {
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: relative;
  z-index: 1;
}

.marca__logoRespaldo {
  display: none;
  position: relative;
  z-index: 1;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: rgba(255, 255, 255, 0.9);
}

.marca__logo--respaldo .marca__logoRespaldo {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}
.marca__logo--respaldo::after { opacity: 0.55; }

.marca__titulo h1 {
  font-size: 22px;
  margin: 0;
  letter-spacing: 0.3px;
}
.marca__titulo p {
  margin: 6px 0 0;
  color: var(--atenuado);
  font-size: 13.5px;
  line-height: 1.35;
}

.marca__estadisticas {
  margin-top: 6px;
  display: grid;
  gap: 14px;
}

.estadistica {
  display: grid;
  gap: 7px;
}
.mensajeError{
  margin: 8px 2px 0;
  color: rgba(255, 140, 140, .95);
  font-size: 12.5px;
}

.estadistica__etiqueta {
  font-size: 12px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.estadistica__barra {
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.estadistica__barra i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(44,184,175,0.95), rgba(44,184,175,0.38));
  box-shadow: 0 0 24px rgba(44, 184, 175, 0.30);
}

.marca__pie {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.punto {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c-2);
  box-shadow: 0 0 18px rgba(44, 184, 175, 0.55);
}

.panel {
  padding: 34px 34px 26px;
  background: linear-gradient(180deg, rgba(34,34,34,0.92), rgba(34,34,34,0.78));
  display: flex;
  flex-direction: column;
}

.panel__encabezado h2 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0.2px;
}
.panel__encabezado p {
  margin: 8px 0 0;
  font-size: 13.5px;
  line-height: 1.45;
}

.formulario {
  margin-top: 22px;
  display: grid;
  gap: 14px;
}

.campo {
  display: grid;
  gap: 8px;
}
.campo__etiqueta {
  font-size: 12px;
  letter-spacing: 0.35px;
  text-transform: uppercase;
}
.campo__control {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 14px;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.campo__control:focus-within {
  border-color: rgba(44, 184, 175, 0.65);
  box-shadow: 0 0 0 4px rgba(44, 184, 175, 0.14);
  transform: translateY(-1px);
}

.campo input {
  width: 100%;
  padding: 12px 44px 12px 14px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--texto);
  font-size: 14px;
}
.campo input::placeholder {
  color: rgba(255, 255, 255, 0.38);
}

.campo__icono {
  position: absolute;
  right: 12px;
  opacity: 0.55;
  font-size: 14px;
  user-select: none;
}

.campo__accion {
  position: absolute;
  right: 10px;
  border: 0;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  padding: 7px 10px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
  transition: transform 140ms ease, background 140ms ease;
}
.campo__accion:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}
.campo__accion:active { transform: translateY(0px); }

.fila {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--atenuado);
  font-size: 13px;
  user-select: none;
}
.check input {
  width: 16px;
  height: 16px;
  accent-color: var(--c-2);
}

.link {
  color: rgba(44, 184, 175, 0.92);
  text-decoration: none;
  font-size: 13px;
}
.link:hover { text-decoration: underline; }

.boton {
  margin-top: 8px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(44, 184, 175, 0.45);
  background: linear-gradient(180deg, rgba(44,184,175,0.96), rgba(44,184,175,0.72));
  color: #0b1b1a;
  font-weight: 800;
  letter-spacing: 0.35px;
  cursor: pointer;
  transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
  box-shadow: 0 12px 30px rgba(44, 184, 175, 0.18);
}
.boton:hover {
  transform: translateY(-1px);
  filter: brightness(1.02);
  box-shadow: 0 16px 34px rgba(44, 184, 175, 0.22);
}
.boton:active { transform: translateY(0px); }
.boton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.1);
}



.hint {
  margin: 10px 2px 0;
  color: rgba(255, 255, 255, 0.52);
  font-size: 12.5px;
  line-height: 1.35;
}

.panel__footer {
  margin-top: auto;
  padding-top: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12.5px;
}
.sep { opacity: 0.35; }
.link--muted { color: rgba(255, 255, 255, 0.55); }
.link--muted:hover { color: rgba(255, 255, 255, 0.75); }

.crear {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: var(--atenuado);
  font-size: 13px;
}

.crear__enlace {
  color: rgba(44, 184, 175, 0.92);
  font-weight: 700;
  text-decoration: none;
}

.crear__enlace:hover {
  text-decoration: underline;
}
</style>
