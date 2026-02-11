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

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const publicRouteNames = new Set(["login", "crear-cuenta"]);

router.beforeEach((to) => {
  const rawUsuario = localStorage.getItem("usuario");
  const isAuthed = Boolean(rawUsuario);

  if (!isAuthed && !publicRouteNames.has(to.name)) {
    return { name: "login", replace: true };
  }

  if (isAuthed && to.name === "login") {
    return { name: "principal", replace: true };
  }

  return true;
});

export default router;
