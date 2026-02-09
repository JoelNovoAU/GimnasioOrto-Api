<script setup>
import { ref, onMounted, computed } from "vue";
import ActividadIndividual from "./actividad_individual.vue";


const usuario = ref(null);

const API = "http://localhost:3000";
const actividades = ref([]);
const cargandoAct = ref(false);
const errorAct = ref("");

const cargarActividades = async () => {
  errorAct.value = "";
  cargandoAct.value = true;
  try {
    const resp = await fetch(`${API}/actividades`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.mensaje || "Error cargando actividades");
    actividades.value = data.actividades || [];
  } catch (e) {
    errorAct.value = e?.message || "Error";
  } finally {
    cargandoAct.value = false;
  }
};

const busqueda = ref("");
const actividadesFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return actividades.value;
  return actividades.value.filter((a) => (a.nombre || "").toLowerCase().includes(q));
});
const vistaActividad = ref("lista");
const actividadSeleccionadaId = ref("");
const cerrarSesion = () => {
  localStorage.removeItem("usuario");
  usuario.value = null;

  window.location.reload();

};

const abrirActividad = (actividad) => {
  console.log("CLICK tarjeta -> actividad completa:", actividad);

  const id = actividad?._id || actividad?.id;
  console.log("ID detectado:", id);

  if (!id) {
    console.warn("⚠️ No hay _id ni id en la actividad. Claves disponibles:", Object.keys(actividad || {}));
    return;
  }

  console.log("Intentando abrir detalle de actividad:", `/actividad_individual/${id}`);

  actividadSeleccionadaId.value = id;
  vistaActividad.value = "detalle";

};

const volverALista = () => {
  vistaActividad.value = "lista";
  actividadSeleccionadaId.value = "";
};


const nombreMostrado = computed(() => {
  const u = usuario.value;
  if (!u) return "No hay usuario";
  if (u.nombre && u.apellido) return `${u.nombre} ${u.apellido}`;
  if (u.nombre) return u.nombre;
  if (u.correo) return u.correo;
  return "Usuario";
});

const baseUrl = import.meta.env.BASE_URL || "/";
const toPublicUrl = (path) => {
  const p = String(path || "").replace(/^\/+/, "");
  if (!p) return baseUrl;
  return baseUrl.endsWith("/") ? `${baseUrl}${p}` : `${baseUrl}/${p}`;
};

const normalizarFoto = (foto, fallback) => {
  const resolvedFallback =
    fallback && (fallback.startsWith("http") ? fallback : toPublicUrl(fallback));

  if (!foto || typeof foto !== "string") return resolvedFallback;
  const f = foto.trim();
  if (!f) return resolvedFallback;
  if (f.startsWith("http://") || f.startsWith("https://")) return f;
  if (f.startsWith("/")) return toPublicUrl(f.slice(1));
  if (f.startsWith("imagenes/")) return toPublicUrl(f);
  return toPublicUrl(`imagenes/${f}`);
};

const fotoMostrada = computed(() => {
  const u = usuario.value;
  return normalizarFoto(u?.foto, "imagenes/persona1.jpg");
});

const esAdmin = computed(() => usuario.value?.rol === "admin");

const nuevaNombre = ref("");
const nuevaFoto = ref("");
const nuevaDescripcion = ref("");
const creando = ref(false);
const msgCrear = ref("");

const crearActividad = async () => {
  msgCrear.value = "";
  if (!nuevaNombre.value.trim() || !nuevaDescripcion.value.trim()) {
    msgCrear.value = "Nombre y descripción son obligatorios.";
    return;
  }

  creando.value = true;
  try {
    const resp = await fetch(`${API}/actividades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nuevaNombre.value,
        foto: nuevaFoto.value,
        descripcion: nuevaDescripcion.value,
        usuario: usuario.value, 
      }),
    });

    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.mensaje || "No se pudo crear");

    nuevaNombre.value = "";
    nuevaFoto.value = "";
    nuevaDescripcion.value = "";
    msgCrear.value = "Actividad creada";

    await cargarActividades(); 
  } catch (e) {
    msgCrear.value = `⚠️ ${e?.message || "Error"}`;
  } finally {
    creando.value = false;
  }
};

onMounted(() => {
  try {
    const guardado = localStorage.getItem("usuario");
    usuario.value = guardado ? JSON.parse(guardado) : null;
  } catch {
    usuario.value = null;
  }

  cargarActividades(); 
});
</script>

<template>
  <div class="principal">
   <header class="topbar">
  <div class="topbar__izq">
    <h1 class="topbar__titulo">Principal</h1>
    <p class="topbar__subtitulo">Bienvenido/a a tu panel</p>
  </div>

  <div class="topbar__der" aria-label="Usuario">
    <div class="usuario">
      <img class="usuario__foto" :src="fotoMostrada" alt="Foto de usuario" />
      <div class="usuario__info">
        <span class="usuario__etiqueta">Usuario</span>
        <span class="usuario__nombre">{{ nombreMostrado }}</span>
      </div>
      <span v-if="esAdmin" class="badgeAdmin">ADMIN</span>
    </div>

    <button class="btnSalir" type="button" @click="cerrarSesion" title="Cerrar sesión">
      <img class="iconosalir" src="/imagenes/logout.png" alt="Salir" />
    </button>
  </div>
</header>


    <main class="contenido">
      <section class="seccion">
        <ActividadIndividual
          v-if="vistaActividad === 'detalle'"
          :id="actividadSeleccionadaId"
          :onVolver="volverALista"
        />
        <template v-else>
        <div class="seccion__header">
          <div>
            <h2 class="seccion__titulo">Actividades</h2>
            <p class="seccion__texto">Elegí una actividad para ver más información.</p>
          </div>

          <div class="buscador">
            <input
              v-model="busqueda"
              class="buscador__input"
              type="text"
              placeholder="Buscar actividad…"
            />
          </div>
        </div>

        <section v-if="esAdmin" class="adminBox">
          <h3 class="adminBox__titulo">Administración: crear actividad</h3>

          <div class="adminGrid">
            <input v-model="nuevaNombre" class="adminInput" placeholder="Nombre (ej: Pilates)" />
            <input v-model="nuevaFoto" class="adminInput" placeholder="URL de foto (opcional)" />
            <input v-model="nuevaDescripcion" class="adminInput" placeholder="Descripción" />
            <button class="adminBtn" :disabled="creando" @click="crearActividad">
              {{ creando ? "Creando…" : "Crear" }}
            </button>
          </div>

          <p v-if="msgCrear" class="adminMsg">{{ msgCrear }}</p>
        </section>

        <p v-if="cargandoAct" class="vacio">Cargando actividades…</p>
        <p v-else-if="errorAct" class="vacio">⚠️ {{ errorAct }}</p>

        <div v-else class="grid">
          <article
  v-for="actividad in actividadesFiltradas"
  :key="actividad._id || actividad.id"
  class="tarjeta"
@click="console.log('CLICK DOM tarjeta'); abrirActividad(actividad)"
  @keydown.enter.prevent="abrirActividad(actividad)"
  @keydown.space.prevent="abrirActividad(actividad)"
  role="button"
  tabindex="0"
>

            <div class="tarjeta__imgWrap">
              <img
                class="tarjeta__img"
                :src="normalizarFoto(actividad.foto, 'imagenes/fondo2.jpg')"
                :alt="actividad.nombre"
              />
            </div>

            <div class="tarjeta__body">
              <h3 class="tarjeta__titulo">{{ actividad.nombre }}</h3>
              <p class="tarjeta__desc">{{ actividad.descripcion }}</p>

              <div class="tarjeta__footer">
                <span class="chip">Ver detalles</span>
              </div>
            </div>
          </article>
        </div>

        <p v-if="!cargandoAct && !errorAct && actividadesFiltradas.length === 0" class="vacio">
          No se encontraron actividades.
        </p>
        </template>
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
  --suave2:rgba(255,255,255,.14);
  --sombra:0 18px 60px rgba(0,0,0,.55);
}
*{ box-sizing:border-box; }

.principal{
  min-height:100vh;
  color:var(--texto);
  background:
    radial-gradient(1200px 700px at 20% 10%, rgba(44,184,175,.12), transparent 60%),
    radial-gradient(900px 600px at 90% 70%, rgba(44,184,175,.08), transparent 55%),
    linear-gradient(180deg, var(--c-3), #171717 70%);
  padding: 26px;
}

.topbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding: 18px 18px;
  border-radius: 20px;

  background:
    radial-gradient(700px 220px at 12% 30%, rgba(44,184,175,.22), transparent 60%),
    radial-gradient(520px 220px at 92% 10%, rgba(44,184,175,.14), transparent 65%),
    linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
  border: 1px solid rgba(44,184,175,.22);
  box-shadow: 0 18px 60px rgba(0,0,0,.55);
  position: relative;
  overflow: hidden;
}

.topbar::before{
  content:"";
  position:absolute;
  left:0; top:0;
  width:100%;
  height:3px;
  background: linear-gradient(90deg, rgba(44,184,175,.0), rgba(44,184,175,.95), rgba(44,184,175,.0));
  opacity:.9;
}

.topbar__titulo{
  margin:0;
  font-size: 22px;
  letter-spacing:.2px;
  font-weight: 950;
}
.topbar__subtitulo{
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13.5px;
}

.topbar__der{
  display:flex;
  align-items:center;
  gap:12px;
}

.usuario{
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 12px;
  border-radius: 16px;
  background: rgba(0,0,0,.20);
  border: 1px solid rgba(44,184,175,.18);
  box-shadow: 0 10px 26px rgba(0,0,0,.22);
}

.usuario__foto{
  width: 42px;
  height: 42px;
  border-radius: 14px;
  object-fit: cover;
  border: 1px solid rgba(44,184,175,.45);
  box-shadow: 0 0 0 3px rgba(44,184,175,.10);
}

.usuario__etiqueta{
  font-size: 10.5px;
  color: rgba(44,184,175,.85);   
  letter-spacing: .45px;
  text-transform: uppercase;
}
.usuario__nombre{
  font-weight: 900;
  font-size: 13.5px;
}

.badgeAdmin{
  margin-left: 6px;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .6px;
  color: rgba(44,184,175,.95);
  background: rgba(44,184,175,.12);
  border: 1px solid rgba(44,184,175,.28);
  padding: 6px 9px;
  border-radius: 999px;
}

.btnSalir{
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(44,184,175,.25);
  background: rgba(0,0,0,.20);
  display:inline-flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
}

.btnSalir:hover{
  transform: translateY(-1px);
  border-color: rgba(44,184,175,.55);
  background: rgba(44,184,175,.10);
  box-shadow: 0 14px 30px rgba(0,0,0,.35), 0 0 0 4px rgba(44,184,175,.10);
}

.iconosalir{
  width: 22px;
  height: 22px;
  object-fit: contain;
  display:block;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,.45));
}

.usuario__info{
  display:grid;
  line-height: 1.1;
}

.usuario__etiqueta{
  font-size: 11px;
  color: var(--muted);
  letter-spacing: .35px;
  text-transform: uppercase;
}

.usuario__nombre{
  font-weight: 800;
  font-size: 13.5px;
}

.contenido{
  margin-top: 18px;
}

.seccion{
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
  border: 1px solid rgba(255,255,255,.08);
}

.seccion__header{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.seccion__titulo{
  margin:0;
  font-size: 18px;
  letter-spacing:.2px;
}

.seccion__texto{
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.buscador__input{
  width: min(320px, 52vw);
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
  color:var(--texto);
  outline: none;
}
.buscador__input:focus{
  border-color: rgba(44,184,175,.65);
  box-shadow: 0 0 0 4px rgba(44,184,175,.12);
}

.grid{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 20px;
}

.tarjeta{
  overflow:hidden;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  cursor:pointer;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}
.tarjeta:hover{
  transform: translateY(-2px);
  border-color: rgba(44,184,175,.45);
  box-shadow: 0 18px 40px rgba(0,0,0,.35);
}

.tarjeta__imgWrap{
  height: 140px;
  background: rgba(255,255,255,.03);
}
.tarjeta__img{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display:block;
}

.tarjeta__body{
  padding: 12px 12px 14px;
}

.tarjeta__titulo{
  margin:0;
  font-size: 15px;
  font-weight: 900;
  letter-spacing:.2px;
}

.tarjeta__desc{
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 12.8px;
  line-height: 1.35;
}

.tarjeta__footer{
  margin-top: 12px;
  display:flex;
  justify-content:flex-end;
}

.chip{
  font-size: 12px;
  font-weight: 800;
  color: rgba(44,184,175,.95);
  background: rgba(44,184,175,.10);
  border: 1px solid rgba(44,184,175,.22);
  padding: 6px 10px;
  border-radius: 999px;
}

.vacio{
  margin: 14px 2px 0;
  color: var(--muted);
  font-size: 13px;
}

/* ADMIN */
.adminBox{
  margin-top: 14px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(44,184,175,.22);
  background: rgba(44,184,175,.06);
}
.adminBox__titulo{
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 900;
}
.adminGrid{
  display:grid;
  grid-template-columns: 1.2fr 1.6fr 2fr auto;
  gap: 10px;
}
.adminInput{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
  color: var(--texto);
  outline: none;
}
.adminBtn{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(44,184,175,.35);
  background: rgba(44,184,175,.14);
  color: rgba(44,184,175,.95);
  font-weight: 900;
  cursor: pointer;
}
.adminBtn:disabled{
  opacity: .6;
  cursor: not-allowed;
}
.adminMsg{
  margin: 10px 2px 0;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 980px){
  .grid{ grid-template-columns: repeat(2, 1fr); }
  .adminGrid{ grid-template-columns: 1fr; }
}
@media (max-width: 640px){
  .topbar{ flex-direction: column; align-items: stretch; }
  .topbar__der{ display:flex; justify-content:flex-start; }
  .grid{ grid-template-columns: 1fr; }
}
</style>
