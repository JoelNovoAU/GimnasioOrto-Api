import { createRouter, createWebHashHistory } from "vue-router";
import Login from "../login.vue";
import Principal from "../principal.vue";
import MisReservas from "../misreservas.vue";
import CrearCuenta from "../crearcuenta.vue";

const routes = [
  { path: "/", name: "login", component: Login },
  { path: "/crear-cuenta", name: "crear-cuenta", component: CrearCuenta },
  { path: "/principal", name: "principal", component: Principal },
  { path: "/mis-reservas", name: "mis-reservas", component: MisReservas },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
