<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "Confirmar" },
  message: { type: String, default: "" },
  confirmText: { type: String, default: "Confirmar" },
  cancelText: { type: String, default: "Cancelar" },
});

const emit = defineEmits(["confirm", "cancel"]);
</script>

<template>
  <div v-if="open" class="modalBackdrop" @click.self="emit('cancel')">
    <div class="modal">
      <div class="modalHeader">
        <h3 class="modalTitle">{{ title }}</h3>
        <button class="modalClose" type="button" @click="emit('cancel')" aria-label="Cerrar">
          ×
        </button>
      </div>
      <p class="modalMsg">{{ message }}</p>
      <div class="modalActions">
        <button class="btnConfirm" type="button" @click="emit('confirm')">
          {{ confirmText }}
        </button>
        <button class="btnCancel" type="button" @click="emit('cancel')">
          {{ cancelText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modalBackdrop{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 20px;
  z-index: 70;
}
.modal{
  width: min(520px, 92vw);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(20,20,20,.98), rgba(16,16,16,.98));
  border: 1px solid rgba(44,184,175,.25);
  box-shadow: 0 26px 60px rgba(0,0,0,.6);
  padding: 16px;
}
.modalHeader{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom: 10px;
}
.modalTitle{
  margin:0;
  font-size: 16px;
  font-weight: 900;
  color: rgba(255,255,255,.92);
}
.modalClose{
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.92);
  font-size: 18px;
  cursor: pointer;
}
.modalMsg{
  margin: 0 0 12px;
  color: rgba(255,255,255,.70);
  font-size: 13.5px;
  line-height: 1.35;
}
.modalActions{
  display:flex;
  gap: 10px;
  justify-content:flex-end;
}
.btnConfirm{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 120, 120, .35);
  background: rgba(255, 120, 120, .16);
  color: #ffe5e5;
  font-weight: 900;
  cursor:pointer;
}
.btnCancel{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.92);
  font-weight: 900;
  cursor:pointer;
}
</style>
