<script setup>
import { ref, computed } from "vue";

const nombre = ref("");
const apellido = ref("");
const correo = ref("");
const telefono = ref("");
const contrasena = ref("");
const confirmarContrasena = ref("");

const mostrarContrasena = ref(false);
const mostrarConfirmacion = ref(false);
const cargando = ref(false);

const contrasenasCoinciden = computed(
  () => contrasena.value === confirmarContrasena.value
);

const enviarFormulario = async () => {
  if (!contrasenasCoinciden.value) return;

  cargando.value = true;
  try {
    const respuesta = await fetch("http://localhost:3000/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre.value,
        apellido: apellido.value,
        correo: correo.value,
        telefono: telefono.value,
        contrasena: contrasena.value,
      }),
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      alert(data?.mensaje || "No se pudo crear el usuario");
      return;
    }

    volverAlLogin();
  } catch (e) {
  console.error("Error real del fetch:", e);
  alert("Error de conexión con la API: " + (e?.message || "desconocido"));
}
 finally {
    cargando.value = false;
  }
};


const emit = defineEmits(["volver"]);
const volverAlLogin = () => emit("volver");
</script>

<template>
  <div class="autenticacion">
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
              <span>ML</span>
            </div>
          </div>

          <div class="marca__titulo">
            <h1>Move & Lite</h1>
            <p>Creá tu cuenta y empezá hoy.</p>
          </div>
        </div>

        <div class="marca__estadisticas">
          <div class="estadistica">
            <span class="estadistica__etiqueta">Planificación</span>
            <span class="estadistica__barra"><i style="width: 78%"></i></span>
          </div>
          <div class="estadistica">
            <span class="estadistica__etiqueta">Fuerza</span>
            <span class="estadistica__barra"><i style="width: 84%"></i></span>
          </div>
          <div class="estadistica">
            <span class="estadistica__etiqueta">Disciplina</span>
            <span class="estadistica__barra"><i style="width: 92%"></i></span>
          </div>
        </div>

      
      </section>

      <section class="panel" aria-label="Crear cuenta">
        <header class="panel__encabezado">
          <h2>Crear cuenta</h2>
          <p>Completá los datos para registrarte.</p>
        </header>

        <form class="formulario" @submit.prevent="enviarFormulario">
          <div class="cuadricula2">
            <label class="campo">
              <span class="campo__etiqueta">Nombre</span>
              <div class="campo__control">
                <input v-model.trim="nombre" type="text" placeholder="Juan" required />
              </div>
            </label>

            <label class="campo">
              <span class="campo__etiqueta">Apellido</span>
              <div class="campo__control">
                <input v-model.trim="apellido" type="text" placeholder="Pérez" required />
              </div>
            </label>
          </div>

          <label class="campo">
            <span class="campo__etiqueta">Correo</span>
            <div class="campo__control">
              <input v-model.trim="correo" type="email" placeholder="tu@correo.com" required />
              <span class="campo__icono" aria-hidden="true">✉</span>
            </div>
          </label>

          <label class="campo">
            <span class="campo__etiqueta">Teléfono</span>
            <div class="campo__control">
              <input
              v-model="telefono"
              type="tel"
              inputmode="numeric"
              maxlength="11"
              placeholder="+34 111 222 333"
              />
            <span class="campo__icono" aria-hidden="true">☎</span>
            </div>
          </label>

          <div class="cuadricula2">
            <label class="campo">
              <span class="campo__etiqueta">Contraseña</span>
              <div class="campo__control">
                <input
                  v-model="contrasena"
                  :type="mostrarContrasena ? 'text' : 'password'"
                  placeholder="••••••••"
                  minlength="8"
                  required
                />
               
              </div>
            </label>

            <label class="campo">
              <span class="campo__etiqueta">Confirmar</span>
              <div class="campo__control" >
                <input
                  v-model="confirmarContrasena"
                  :type="mostrarConfirmacion ? 'text' : 'password'"
                  placeholder="••••••••"
                  minlength="8"
                  required
                />
               
              </div>
            </label>
          </div>



          <button class="botonPrincipal" type="submit" :disabled="cargando || !contrasenasCoinciden">
            <span v-if="!cargando">Crear cuenta</span>
            <span v-else class="cargandoSpinner" aria-label="Cargando"></span>
          </button>

          <div class="accionesSecundarias">
            <span class="accionesSecundarias__texto">¿Ya tenés cuenta?</span>
            <a class="accionesSecundarias__enlace" href="#" @click.prevent="volverAlLogin">
              Volver al inicio de sesión
            </a>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>

<style scoped>
:root{
  --c-1:#323232;
  --c-2:#2cb8af;
  --c-3:#222222;

  --texto:rgba(255,255,255,.92);
  --muted:rgba(255,255,255,.68);
  --suave:rgba(255,255,255,.10);
  --sombra:0 18px 60px rgba(0,0,0,.55);
}

*{ box-sizing:border-box; }

.autenticacion{
  min-height:100vh;
  display:grid;
  place-items:center;
  padding:40px;
  position:relative;
  overflow:hidden;

  background:
    radial-gradient(1200px 700px at 20% 10%, rgba(44,184,175,.22), transparent 60%),
    radial-gradient(900px 600px at 90% 70%, rgba(44,184,175,.14), transparent 55%),
    linear-gradient(180deg, rgba(23,23,23,.92), rgba(18,18,18,.98));
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}


.autenticacion__fondo{
  position:absolute;
  inset:-2px;
  background:
    linear-gradient(135deg, rgba(255,255,255,.03) 0 2px, transparent 2px 12px),
    linear-gradient(315deg, rgba(255,255,255,.02) 0 2px, transparent 2px 14px);
  background-size:22px 22px;
  filter:blur(.2px);
  opacity:.65;
  pointer-events:none;
}

.autenticacion__contenedor{
  width:min(1060px,100%);
  display:grid;
  grid-template-columns:1.05fr .95fr;
  border-radius:22px;
  overflow:hidden;
  box-shadow:var(--sombra);
  border:1px solid rgba(255,255,255,.08);
  background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
  backdrop-filter:blur(10px);
}

.marca{
  padding:34px 34px 28px;
  background:
    radial-gradient(900px 500px at 10% 20%, rgba(44,184,175,.18), transparent 58%),
    linear-gradient(180deg, rgba(50,50,50,.55), rgba(34,34,34,.85));
  border-right:1px solid rgba(255,255,255,.08);
  display:flex;
  flex-direction:column;
  gap:22px;
}

.marca__encabezado{ display:flex; align-items:center; gap:16px; }

.marca__logo{
  width:94px;
  height:94px;
  border-radius:16px;
  background:linear-gradient(145deg, rgba(44,184,175,.22), rgba(255,255,255,.06));
  border:1px solid rgba(44,184,175,.32);
  display:grid;
  place-items:center;
  position:relative;
  overflow:hidden;
}
.marca__logo::after{
  content:"";
  position:absolute;
  inset:-40%;
  background:radial-gradient(circle, rgba(44,184,175,.35), transparent 60%);
  transform:rotate(25deg);
  opacity:.9;
}
.marca__logoImagen{ width:100%; height:100%; object-fit:contain; position:relative; z-index:1; }
.marca__logoRespaldo{ display:none; position:relative; z-index:1; font-weight:800; letter-spacing:.6px; }
.marca__logo--respaldo .marca__logoRespaldo{ display:grid; place-items:center; width:100%; height:100%; }

.marca__titulo h1{ font-size:22px; margin:0; letter-spacing:.3px; }
.marca__titulo p{ margin:6px 0 0;  font-size:13.5px; line-height:1.35; }

.marca__estadisticas{ margin-top:6px; display:grid; gap:14px; }
.estadistica{ display:grid; gap:7px; }
.estadistica__etiqueta{ font-size:12px;  letter-spacing:.4px; text-transform:uppercase; }
.estadistica__barra{
  height:10px;
  border-radius:999px;
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.08);
  overflow:hidden;
}
.estadistica__barra i{
  display:block;
  height:100%;
  border-radius:999px;
  background:linear-gradient(90deg, rgba(44,184,175,.95), rgba(44,184,175,.38));
  box-shadow:0 0 24px rgba(44,184,175,.30);
}


.panel{
  padding:34px 34px 26px;
  background:linear-gradient(180deg, rgba(34,34,34,.92), rgba(34,34,34,.78));
  display:flex;
  flex-direction:column;
}

.panel__encabezado h2{ margin:0; font-size:22px; letter-spacing:.2px; }
.panel__encabezado p{ margin:8px 0 0;  font-size:13.5px; line-height:1.45; }

.formulario{ margin-top:22px; display:grid; gap:14px; }

.cuadricula2{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;
}

.campo{ display:grid; gap:8px; }
.campo__etiqueta{ font-size:12px;  letter-spacing:.35px; text-transform:uppercase; }

.campo__control{
  position:relative;
  display:flex;
  align-items:center;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.10);
  border-radius:14px;
  transition:border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.campo__control:focus-within{
  border-color:rgba(44,184,175,.65);
  box-shadow:0 0 0 4px rgba(44,184,175,.14);
  transform:translateY(-1px);
}
.campo__control.es-peligro{
  border-color: rgba(255, 110, 110, .6);
  box-shadow: 0 0 0 4px rgba(255,110,110,.12);
}

.campo input{
  width:100%;
  padding:12px 110px 12px 14px;
  border:0;
  outline:none;
  background:transparent;
  color:var(--texto);
  font-size:14px;
}
.campo input::placeholder{ color:rgba(255,255,255,.38); }

.campo__icono{
  position:absolute;
  right:12px;
  opacity:.55;
  font-size:14px;
  user-select:none;
}

.campo__accion{
  position:absolute;
  right:10px;
  border:0;
  background:rgba(255,255,255,.08);
  color:rgba(255,255,255,.82);
  padding:7px 10px;
  border-radius:10px;
  cursor:pointer;
  font-size:12px;
  transition:transform 140ms ease, background 140ms ease;
}
.campo__accion:hover{ background:rgba(255,255,255,.12); transform:translateY(-1px); }

.mensajeError{
  margin: -2px 2px 0;
  color: rgba(255, 140, 140, .95);
  font-size: 12.5px;
}

.botonPrincipal{
  margin-top:8px;
  width:100%;
  padding:12px 14px;
  border-radius:14px;
  border:1px solid rgba(44,184,175,.45);
  background:linear-gradient(180deg, rgba(44,184,175,.96), rgba(44,184,175,.72));
  color:#0b1b1a;
  font-weight:800;
  letter-spacing:.35px;
  cursor:pointer;
  transition:transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
  box-shadow:0 12px 30px rgba(44,184,175,.18);
}
.botonPrincipal:hover{ transform:translateY(-1px); filter:brightness(1.02); box-shadow:0 16px 34px rgba(44,184,175,.22); }
.botonPrincipal:disabled{ opacity:.6; cursor:not-allowed; }


.accionesSecundarias{
  margin-top:14px;
  display:flex;
  gap:8px;
  align-items:center;
  justify-content:center;
  
  font-size:13px;
}
.accionesSecundarias__enlace{
  color:rgba(44,184,175,.92);
  font-weight:700;
  text-decoration:none;
}
.accionesSecundarias__enlace:hover{ text-decoration:underline; }


</style>
