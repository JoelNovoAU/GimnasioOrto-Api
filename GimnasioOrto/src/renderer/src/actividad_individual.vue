<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { apiFetch } from "./auth/api";

const props = defineProps({
  id: { type: [String, Number], required: true },
  onVolver: { type: Function, default: null },
});

const cargando = ref(false);
const error = ref("");
const actividad = ref(null);

const actividadId = computed(() => String(props.id ?? ""));

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

const fotoMostrada = computed(() =>
  normalizarFoto(actividad.value?.foto, "imagenes/fondo2.jpg")
);

const cargarActividad = async () => {
  if (!actividadId.value) return;
  error.value = "";
  cargando.value = true;
  try {
    const resp = await apiFetch(`/actividades/${actividadId.value}`);
    const data = await resp.json();
    if (!data || typeof data !== "object") {
      throw new Error("Respuesta invalida");
    }
    if (!resp.ok || !data.ok) throw new Error(data.mensaje || "No se pudo cargar");
    if (!data.actividad) throw new Error("La API no devolvio actividad");
    actividad.value = data.actividad;
  } catch (e) {
    error.value = e?.message || "Error";
  } finally {
    cargando.value = false;
  }
};

onMounted(cargarActividad);
watch(actividadId, () => cargarActividad());

const volver = () => {
  if (props.onVolver) props.onVolver();
};
</script>

<template>
  <div class="pantalla">
    <header class="header">
      <button class="btn" @click="volver">← Volver</button>
      <h1 class="titulo">Actividad</h1>
    </header>

    <p v-if="cargando" class="estado">Cargando…</p>
    <p v-else-if="error" class="estado">⚠️ {{ error }}</p>

    <section v-else-if="actividad" class="card">
      <img class="foto" :src="fotoMostrada" :alt="actividad.nombre || 'Actividad'" />
      <div class="body">
        <h2 class="nombre">{{ actividad.nombre }}</h2>
        <p class="desc">{{ actividad.descripcion }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pantalla{
  min-height:100vh;
  padding: 26px;
  color: rgba(255,255,255,.92);
  background: linear-gradient(180deg, #222, #171717 70%);
}
.header{
  display:flex;
  align-items:center;
  gap:12px;
  margin-bottom: 16px;
}
.btn{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
  color: rgba(255,255,255,.92);
  cursor:pointer;
}
.titulo{ margin:0; font-size: 18px; font-weight: 950; }
.estado{ color: rgba(255,255,255,.70); }
.card{
  overflow:hidden;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
}
.foto{ width:100%; height: 240px; object-fit: cover; display:block; }
.body{ padding: 14px; }
.nombre{ margin:0; font-size: 20px; font-weight: 950; }
.desc{ margin: 10px 0 0; color: rgba(255,255,255,.72); line-height: 1.4; }
</style>
