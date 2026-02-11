<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import ConfirmModal from "./components/ConfirmModal.vue";

const API = "http://localhost:3000";
const router = useRouter();

const usuario = ref(null);
const actividades = ref([]);
const reservasIds = ref(new Set());
const cargando = ref(false);
const error = ref("");
const confirmOpen = ref(false);
const confirmTitle = ref("Confirmar");
const confirmMessage = ref("");
const confirmAction = ref(null);
const minutosParaCancelar = 15;

const cargarDatos = async () => {
  error.value = "";
  cargando.value = true;
  try {
    const uid = usuario.value?.id || usuario.value?._id;
    if (!uid) throw new Error("Debes iniciar sesión");

    const [respAct, respRes] = await Promise.all([
      fetch(`${API}/actividades`),
      fetch(`${API}/reservas?usuarioId=${encodeURIComponent(uid)}`),
    ]);

    const dataAct = await respAct.json();
    const dataRes = await respRes.json();
    if (!respAct.ok || !dataAct.ok) throw new Error(dataAct.mensaje || "Error cargando actividades");
    if (!respRes.ok || !dataRes.ok) throw new Error(dataRes.mensaje || "Error cargando reservas");

    actividades.value = dataAct.actividades || [];
    reservasIds.value = new Set((dataRes.reservas || []).map((r) => String(r.actividadId)));
  } catch (e) {
    error.value = e?.message || "Error";
  } finally {
    cargando.value = false;
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

const cancelarReserva = async (actividadId) => {
  if (!actividadId) return;
  try {
    const resp = await fetch(`${API}/reservas`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actividadId,
        usuario: usuario.value,
      }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.mensaje || "No se pudo cancelar");
    await cargarDatos();
  } catch (e) {
    alert(e?.message || "Error");
  }
};
const getInicioActividad = (actividad) => {
  const dia = actividad?.dia;
  const hora = actividad?.hora;
  if (!dia || !hora) return null;
  const inicio = new Date(`${dia}T${hora}`);
  if (Number.isNaN(inicio.getTime())) return null;
  return inicio;
};

const puedeCancelarReserva = (actividad) => {
  const inicio = getInicioActividad(actividad);
  if (!inicio) return false;
  const ahora = new Date();
  const diffMin = (inicio - ahora) / 60000;
  return diffMin > minutosParaCancelar;
};

const mensajeCancelacion = (actividad) => {
  const inicio = getInicioActividad(actividad);
  if (!inicio) return "No se puede cancelar: actividad sin fecha u hora válida.";
  const ahora = new Date();
  const diffMin = Math.round((inicio - ahora) / 60000);
  if (diffMin < 0) return "No se puede cancelar: la actividad ya comenzó.";
  return `No se puede cancelar con ${minutosParaCancelar} minutos o menos de anticipación.`;
};

const solicitarCancelarReserva = (actividad) => {
  if (!puedeCancelarReserva(actividad)) {
    alert(mensajeCancelacion(actividad));
    return;
  }
  const actividadId = actividad?._id || actividad?.id;
  solicitarConfirmacion(
    "Cancelar reserva",
    "¿Seguro que quieres cancelar esta reserva?",
    () => cancelarReserva(actividadId)
  );
};

const actividadesReservadas = computed(() => {
  const set = reservasIds.value;
  return actividades.value.filter((a) => set.has(String(a._id || a.id)));
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

const volver = () => {
  router.push("/principal");
};

onMounted(() => {
  try {
    const guardado = localStorage.getItem("usuario");
    usuario.value = guardado ? JSON.parse(guardado) : null;
  } catch {
    usuario.value = null;
  }
  cargarDatos();
});
</script>

<template>
  <div class="principal">
    <header class="topbar">
      <div class="topbar__izq">
        <h1 class="topbar__titulo">Mis reservas</h1>
        <p class="topbar__subtitulo">Tus actividades reservadas</p>
      </div>

      <div class="topbar__der">
        <button class="btnNav" type="button" @click="volver">Volver</button>
      </div>
    </header>

    <main class="contenido">
      <section class="seccion">
        <p v-if="cargando" class="vacio">Cargando reservas…</p>
        <p v-else-if="error" class="vacio">⚠️ {{ error }}</p>

        <div v-else class="grid">
          <article
            v-for="actividad in actividadesReservadas"
            :key="actividad._id || actividad.id"
            class="tarjeta"
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
                <span class="chip chip--reservado">Reservado</span>
              </div>
              <p class="tarjeta__desc">{{ actividad.descripcion }}</p>
              <div class="tarjeta__meta">
                <span v-if="actividad.dia" class="metaItem">Día: {{ actividad.dia }}</span>
                <span v-if="actividad.hora" class="metaItem">Hora: {{ actividad.hora }}</span>
              </div>
              <div class="tarjeta__acciones">
                <button
                  class="btnCancelar"
                  type="button"
                  :disabled="!puedeCancelarReserva(actividad)"
                  :title="!puedeCancelarReserva(actividad) ? mensajeCancelacion(actividad) : ''"
                  @click="solicitarCancelarReserva(actividad)"
                >
                  Cancelar reserva
                </button>
              </div>
            </div>
          </article>
        </div>

        <p v-if="!cargando && !error && actividadesReservadas.length === 0" class="vacio">
          Todavía no tienes reservas.
        </p>
      </section>
    </main>
  </div>

  <ConfirmModal
    :open="confirmOpen"
    :title="confirmTitle"
    :message="confirmMessage"
    confirm-text="Confirmar"
    cancel-text="Volver"
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

.btnNav{
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(44,184,175,.35);
  background: rgba(44,184,175,.12);
  color: rgba(44,184,175,.95);
  font-weight: 900;
  cursor:pointer;
}

.contenido{ margin-top: 18px; }
.seccion{
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
  border: 1px solid rgba(255,255,255,.08);
}
.grid{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 10px;
}
.tarjeta{
  overflow:hidden;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
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
.tarjeta__body{ padding: 12px 12px 14px; }
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
.tarjeta__acciones{
  margin-top: 10px;
  display:flex;
  justify-content:flex-start;
}
.btnCancelar{
  font-size: 12px;
  font-weight: 800;
  color: #ffe5e5;
  background: rgba(255, 120, 120, .14);
  border: 1px solid rgba(255, 120, 120, .28);
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
}
.btnCancelar:disabled{
  opacity: .55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.btnCancelar:hover{
  transform: translateY(-1px);
  border-color: rgba(255, 120, 120, .45);
  box-shadow: 0 10px 20px rgba(0,0,0,.25);
}
.metaItem{
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
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
.vacio{
  margin: 14px 2px 0;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 980px){
  .grid{ grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px){
  .topbar{ flex-direction: column; align-items: stretch; }
  .topbar__der{ display:flex; justify-content:flex-start; }
  .grid{ grid-template-columns: 1fr; }
}
</style>

