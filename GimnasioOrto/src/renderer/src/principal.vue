<script setup>
import { computed } from "vue";

const usuario = computed(() => {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch {
    return null;
  }
});

const salir = () => {
  localStorage.removeItem("usuario");
  window.location.reload();
};
</script>

<template>
  <div class="principal">
    <div class="card">
      <h1>Página principal</h1>

      <p v-if="usuario">
        Bienvenido, <b>{{ usuario.nombre }} {{ usuario.apellido }}</b>
      </p>
      <p v-else>Sin sesión activa.</p>

      <button class="btn" @click="salir">Cerrar sesión</button>
    </div>
  </div>
</template>

<style scoped>
.principal{
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #111;
  color: #fff;
  padding: 24px;
}
.card{
  width: min(520px, 100%);
  border-radius: 16px;
  padding: 22px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
}
.btn{
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 0;
  cursor: pointer;
}
.mensajeError{
  margin: 8px 2px 0;
  color: rgba(255, 140, 140, .95);
  font-size: 12.5px;
}

</style>
