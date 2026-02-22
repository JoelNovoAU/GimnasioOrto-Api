<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import ConfirmModal from "./components/ConfirmModal.vue";
import { apiFetch } from "./auth/api";
import { clearSession, getUsuario } from "./auth/session";
import { ActividadSchema, formatZodIssues } from "./auth/zod";


const usuario = ref(null);
const router = useRouter();

const actividades = ref([]);
const cargandoAct = ref(false);
const errorAct = ref("");
const reservasIds = ref(new Set());

const cargarActividades = async () => {
  errorAct.value = "";
  cargandoAct.value = true;
  try {
    const resp = await apiFetch("/actividades");
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.mensaje || "Error cargando actividades");
    const rawActividades = Array.isArray(data.actividades) ? data.actividades : [];
    const actividadesValidas = [];
    for (const item of rawActividades) {
      const parsed = ActividadSchema.safeParse(item);
      if (!parsed.success) {
        console.warn("Actividad invalida omitida:", formatZodIssues(parsed.error), item);
        continue;
      }
      actividadesValidas.push({ ...item, ...parsed.data });
    }
    actividades.value = actividadesValidas;
  } catch (e) {
    errorAct.value = e?.message || "Error";
  } finally {
    cargandoAct.value = false;
  }
};

const cargarReservas = async () => {
  const uid = usuario.value?.id || usuario.value?._id;
  if (!uid) {
    reservasIds.value = new Set();
    return;
  }
  try {
    const resp = await apiFetch(`/reservas?usuarioId=${encodeURIComponent(uid)}`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.mensaje || "Error cargando reservas");
    const set = new Set((data.reservas || []).map((r) => String(r.actividadId)));
    reservasIds.value = set;
  } catch (e) {
  } finally {
  }
};

const busqueda = ref("");
const actividadesFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return actividades.value;
  return actividades.value.filter((a) => (a.nombre || "").toLowerCase().includes(q));
});
const actividadSeleccionada = ref(null);
const mostrarModalDetalle = ref(false);
const cerrarSesion = () => {
  clearSession();
  usuario.value = null;
  router.replace("/");
};

const irMisReservas = () => {
  router.push("/mis-reservas");
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

  actividadSeleccionada.value = actividad;
  mostrarModalDetalle.value = true;

};

const cerrarActividad = () => {
  mostrarModalDetalle.value = false;
  actividadSeleccionada.value = null;
  msgReserva.value = "";
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
const nuevaDia = ref("");
const nuevaHora = ref("");
const nuevaMaximo = ref("");
const creando = ref(false);
const msgCrear = ref("");
const mostrarModalCrear = ref(false);
const esEdicion = ref(false);
const editId = ref("");
const reservando = ref(false);
const msgReserva = ref("");
const confirmOpen = ref(false);
const confirmTitle = ref("Confirmar");
const confirmMessage = ref("");
const confirmAction = ref(null);

const abrirModalCrear = () => {
  msgCrear.value = "";
  esEdicion.value = false;
  editId.value = "";
  nuevaNombre.value = "";
  nuevaFoto.value = "";
  nuevaDescripcion.value = "";
  nuevaDia.value = "";
  nuevaHora.value = "";
  nuevaMaximo.value = "";
  mostrarModalCrear.value = true;
};
const cerrarModalCrear = () => {
  if (creando.value) return;
  mostrarModalCrear.value = false;
};

const abrirModalEditar = (actividad) => {
  if (!actividad) return;
  msgCrear.value = "";
  esEdicion.value = true;
  editId.value = actividad?._id || actividad?.id || "";
  nuevaNombre.value = actividad?.nombre || "";
  nuevaFoto.value = actividad?.foto || "";
  nuevaDescripcion.value = actividad?.descripcion || "";
  nuevaDia.value = actividad?.dia || "";
  nuevaHora.value = actividad?.hora || "";
  nuevaMaximo.value =
    actividad?.maximoPersonas !== null && actividad?.maximoPersonas !== undefined
      ? String(actividad.maximoPersonas)
      : "";
  mostrarModalCrear.value = true;
};

const guardarActividad = async () => {
  msgCrear.value = "";
  if (!nuevaNombre.value.trim() || !nuevaDescripcion.value.trim()) {
    msgCrear.value = "Nombre y descripción son obligatorios.";
    return;
  }

  creando.value = true;
  try {
    const esEdit = esEdicion.value && editId.value;
    const url = esEdit ? `/actividades/${editId.value}` : "/actividades";
    const method = esEdit ? "PUT" : "POST";
    const resp = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nuevaNombre.value,
        foto: nuevaFoto.value,
        descripcion: nuevaDescripcion.value,
        dia: nuevaDia.value,
        hora: nuevaHora.value,
        maximoPersonas: nuevaMaximo.value,
      }),
    });

    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.mensaje || "No se pudo crear");

    nuevaNombre.value = "";
    nuevaFoto.value = "";
    nuevaDescripcion.value = "";
    nuevaDia.value = "";
    nuevaHora.value = "";
    nuevaMaximo.value = "";
    msgCrear.value = esEdit ? "Actividad actualizada" : "Actividad creada";

    await cargarActividades(); 
    cerrarModalCrear();
  } catch (e) {
    msgCrear.value = `⚠️ ${e?.message || "Error"}`;
  } finally {
    creando.value = false;
  }
};

const solicitarConfirmacion = (title, message, action) => {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmAction.value = action;
  confirmOpen.value = true;
};
const cancelarConfirmacion = () => {
  confirmOpen.value = false;
  confirmAction.value = null;
};
const aceptarConfirmacion = async () => {
  const action = confirmAction.value;
  cancelarConfirmacion();
  if (typeof action === "function") await action();
};

const eliminarActividad = async (actividad) => {
  const id = actividad?._id || actividad?.id;
  if (!id) return;
  try {
    const resp = await apiFetch(`/actividades/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.mensaje || "No se pudo eliminar");
    await cargarActividades();
  } catch (e) {
    alert(e?.message || "Error");
  }
};
const solicitarEliminarActividad = (actividad) => {
  solicitarConfirmacion(
    "Eliminar actividad",
    "¿Seguro que quieres eliminar esta actividad? Esta acción no se puede deshacer.",
    () => eliminarActividad(actividad)
  );
};

onMounted(() => {
  usuario.value = getUsuario();

  cargarActividades(); 
  cargarReservas();
});

const reservarActividad = async () => {
  msgReserva.value = "";
  const act = actividadSeleccionada.value;
  const actId = act?._id || act?.id;
  if (actId && reservasIds.value.has(String(actId))) {
    msgReserva.value = "Ya estás reservado en esta actividad.";
    return;
  }
  if (!usuario.value?.id && !usuario.value?._id) {
    msgReserva.value = "Debes iniciar sesión para reservar.";
    return;
  }
  if (!actId) {
    msgReserva.value = "Actividad inválida.";
    return;
  }
  reservando.value = true;
  try {
    const resp = await apiFetch("/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actividadId: actId,
      }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.mensaje || "No se pudo reservar");
    msgReserva.value = "Reserva confirmada";
    reservasIds.value = new Set([...reservasIds.value, String(actId)]);
    await cargarActividades();
    await cargarReservas();
    const actualizada = actividades.value.find((a) => String(a._id || a.id) === String(actId));
    if (actualizada) actividadSeleccionada.value = actualizada;
    cerrarActividad();
  } catch (e) {
    msgReserva.value = `âš ï¸ ${e?.message || "Error"}`;
  } finally {
    reservando.value = false;
  }
};
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
      <div class="usuario__info">
        <span class="usuario__etiqueta">Usuario</span>
        <span class="usuario__nombre">{{ nombreMostrado }}</span>
      </div>
      <span v-if="esAdmin" class="badgeAdmin">ADMIN</span>
    </div>

    <button class="btnNav" type="button" @click="irMisReservas">
      Mis reservas
    </button>

    <button class="btnSalir" type="button" @click="cerrarSesion" title="Cerrar sesión">
      <img class="iconosalir" src="/imagenes/logout2sin.png" alt="Salir" />
    </button>
  </div>
</header>


    <main class="contenido">
      <section class="seccion">
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

          <button class="adminBtn" type="button" @click="abrirModalCrear">
            Crear actividad
          </button>
        </section>

        <div v-if="mostrarModalCrear" class="modalBackdrop" @click.self="cerrarModalCrear">
          <div class="modal">
            <div class="modalHeader">
              <h3 class="modalTitle">{{ esEdicion ? "Modificar actividad" : "Crear actividad" }}</h3>
              <button class="modalClose" type="button" @click="cerrarModalCrear" aria-label="Cerrar">
                ×
              </button>
            </div>

            <div class="adminGrid">
              <input v-model="nuevaNombre" class="adminInput" placeholder="Nombre (ej: Pilates)" />
              <input v-model="nuevaFoto" class="adminInput" placeholder="URL de foto (opcional)" />
              <input v-model="nuevaDescripcion" class="adminInput" placeholder="Descripción" />
              <input v-model="nuevaDia" class="adminInput" type="date" placeholder="Día" />
              <input v-model="nuevaHora" class="adminInput" type="time" placeholder="Hora" />
              <input
                v-model="nuevaMaximo"
                class="adminInput"
                type="number"
                min="1"
                step="1"
                placeholder="Máximo de personas"
              />
            </div>

            <div class="modalActions">
              <button class="adminBtn" type="button" :disabled="creando" @click="guardarActividad">
                {{ creando ? "Guardando…" : esEdicion ? "Guardar" : "Crear" }}
              </button>
              <button class="adminBtn adminBtn--ghost" type="button" :disabled="creando" @click="cerrarModalCrear">
                Cancelar
              </button>
            </div>

            <p v-if="msgCrear" class="adminMsg">{{ msgCrear }}</p>
          </div>
        </div>

        <p v-if="cargandoAct" class="vacio">Cargando actividades…</p>
        <p v-else-if="errorAct" class="vacio">⚠️ {{ errorAct }}</p>

        <div v-else class="grid">
          <article
            v-for="actividad in actividadesFiltradas"
            :key="actividad._id || actividad.id"
            class="tarjeta"
            @click="abrirActividad(actividad)"
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
              <div class="tarjeta__row">
                <h3 class="tarjeta__titulo">{{ actividad.nombre }}</h3>
                <span v-if="reservasIds.has(String(actividad._id || actividad.id))" class="chip chip--reservado">
                  Reservado
                </span>
              </div>
              <p class="tarjeta__desc">{{ actividad.descripcion }}</p>
              <div class="tarjeta__meta">
                <span v-if="actividad.dia" class="metaItem">Día: {{ actividad.dia }}</span>
                <span v-if="actividad.hora" class="metaItem">Hora: {{ actividad.hora }}</span>
              </div>

            <div class="tarjeta__footer">
              <button class="actionBtn" type="button" @click.stop="abrirActividad(actividad)">
                Ver detalles
              </button>
              <button
                v-if="esAdmin"
                class="actionBtn actionBtn--edit"
                type="button"
                @click.stop="abrirModalEditar(actividad)"
              >
                Modificar
              </button>
              <button
                v-if="esAdmin"
                class="actionBtn actionBtn--delete"
                type="button"
                @click.stop="solicitarEliminarActividad(actividad)"
              >
                Eliminar
              </button>
            </div>
            </div>
          </article>
        </div>

        <p v-if="!cargandoAct && !errorAct && actividadesFiltradas.length === 0" class="vacio">
          No se encontraron actividades.
        </p>
      </section>
    </main>

    <div v-if="mostrarModalDetalle && actividadSeleccionada" class="modalBackdrop" @click.self="cerrarActividad">
      <div class="modal modal--detalle">
        <div class="modalHeader">
          <h3 class="modalTitle">{{ actividadSeleccionada.nombre }}</h3>
          <button class="modalClose" type="button" @click="cerrarActividad" aria-label="Cerrar">
            ×
          </button>
        </div>

        <div class="detalleGrid">
          <img
            class="detalleFoto"
            :src="normalizarFoto(actividadSeleccionada.foto, 'imagenes/fondo2.jpg')"
            :alt="actividadSeleccionada.nombre"
          />
          <div class="detalleBody">
            <p class="detalleDesc">{{ actividadSeleccionada.descripcion }}</p>
            <div class="detalleMeta">
              <span v-if="actividadSeleccionada.dia" class="metaItem">Día: {{ actividadSeleccionada.dia }}</span>
              <span v-if="actividadSeleccionada.hora" class="metaItem">Hora: {{ actividadSeleccionada.hora }}</span>
              <span
                v-if="reservasIds.has(String(actividadSeleccionada._id || actividadSeleccionada.id))"
                class="chip chip--reservado"
              >
                Ya reservado
              </span>
              <span v-if="actividadSeleccionada.llena" class="chip chip--llena">Actividad completa</span>
            </div>
            <p
              v-if="reservasIds.has(String(actividadSeleccionada._id || actividadSeleccionada.id))"
              class="reservaAviso"
            >
              Ya estás reservado en esta actividad.
            </p>
            <p v-else-if="actividadSeleccionada.llena" class="reservaAviso">
              No hay plazas disponibles para esta actividad.
            </p>
            <div class="reservaActions">
              <button
                v-if="!reservasIds.has(String(actividadSeleccionada._id || actividadSeleccionada.id)) && !actividadSeleccionada.llena"
                class="adminBtn"
                type="button"
                :disabled="reservando"
                @click="reservarActividad"
              >
                {{ reservando ? "Reservando…" : "Reservar" }}
              </button>
            </div>
            <p v-if="msgReserva" class="adminMsg">{{ msgReserva }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ConfirmModal
    :open="confirmOpen"
    :title="confirmTitle"
    :message="confirmMessage"
    confirm-text="Eliminar"
    cancel-text="Cancelar"
    @confirm="aceptarConfirmacion"
    @cancel="cancelarConfirmacion"
  />
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

.btnNav{
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(44,184,175,.35);
  background: rgba(44,184,175,.12);
  color: rgba(44,184,175,.95);
  font-weight: 900;
  cursor:pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
}
.btnNav:hover{
  transform: translateY(-1px);
  border-color: rgba(44,184,175,.55);
  background: rgba(44,184,175,.18);
  box-shadow: 0 10px 22px rgba(0,0,0,.30);
}

.btnSalir:hover{
  transform: translateY(-1px);
  border-color: rgba(44,184,175,.55);
  background: rgba(44,184,175,.10);
  box-shadow: 0 14px 30px rgba(0,0,0,.35), 0 0 0 4px rgba(44,184,175,.10);
}

.iconosalir{
  width: 29px;
  height: 29px;
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
.tarjeta__row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 8px;
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
.tarjeta__meta{
  margin-top: 8px;
  display:flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}
.metaItem{
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
}

.tarjeta__footer{
  margin-top: 12px;
  display:flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content:flex-start;
}

.actionBtn{
  font-size: 12px;
  font-weight: 800;
  color: rgba(44,184,175,.95);
  background: rgba(44,184,175,.10);
  border: 1px solid rgba(44,184,175,.22);
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
}
.actionBtn:hover{
  transform: translateY(-1px);
  border-color: rgba(44,184,175,.45);
  box-shadow: 0 10px 20px rgba(0,0,0,.25);
}
.actionBtn--edit{
  color: #f4f2ee;
  background: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.20);
}
.actionBtn--delete{
  color: #ffe5e5;
  background: rgba(255, 120, 120, .14);
  border-color: rgba(255, 120, 120, .28);
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
.chip--reservado{
  color: #f4f2ee;
  background: rgba(255,255,255,.10);
  border-color: rgba(255,255,255,.20);
}
.chip--llena{
  color: #fbe9e9;
  background: rgba(255, 120, 120, .14);
  border-color: rgba(255, 120, 120, .28);
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
.adminBtn--ghost{
  background: rgba(255,255,255,.04);
  color: var(--texto);
  border-color: rgba(255,255,255,.12);
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

.modalBackdrop{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 20px;
  z-index: 50;
}
.modal{
  width: min(720px, 94vw);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(20,20,20,.98), rgba(16,16,16,.98));
  border: 1px solid rgba(44,184,175,.25);
  box-shadow: 0 26px 60px rgba(0,0,0,.6);
  padding: 16px;
}
.modal--detalle{
  width: min(920px, 96vw);
}
.modalHeader{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom: 12px;
}
.modalTitle{
  margin:0;
  font-size: 16px;
  font-weight: 900;
}
.modalClose{
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  color: var(--texto);
  font-size: 18px;
  cursor: pointer;
}
.modalActions{
  display:flex;
  gap: 10px;
  justify-content:flex-end;
  margin-top: 12px;
}

.detalleGrid{
  display:grid;
  grid-template-columns: 1.2fr 1.8fr;
  gap: 14px;
}
.detalleFoto{
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
}
.detalleBody{
  display:flex;
  flex-direction: column;
}
.detalleDesc{
  margin: 0 0 10px;
  color: var(--muted);
  line-height: 1.4;
}
.detalleMeta{
  display:flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.reservaActions{
  display:flex;
  gap: 10px;
  justify-content:flex-start;
  margin-top: 4px;
}
.reservaAviso{
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12.5px;
}

@media (max-width: 980px){
  .grid{ grid-template-columns: repeat(2, 1fr); }
  .adminGrid{ grid-template-columns: 1fr; }
  .detalleGrid{ grid-template-columns: 1fr; }
}
@media (max-width: 640px){
  .topbar{ flex-direction: column; align-items: stretch; }
  .topbar__der{ display:flex; justify-content:flex-start; }
  .grid{ grid-template-columns: 1fr; }
}
</style>
