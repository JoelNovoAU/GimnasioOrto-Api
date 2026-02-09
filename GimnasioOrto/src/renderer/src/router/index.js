import { createRouter, createWebHashHistory } from "vue-router";
import Login from "../login.vue";
import Principal from "../principal.vue";
import ActividadIndividual from "../actividad_individual.vue";

const routes = [
  { path: "/", name: "login", component: Login },

  {
    path: "/principal",
    name: "principal",
    component: Principal,
    children: [
      {
        path: "actividad_individual/:id", // <- OJO: sin "/" al ser hija
        name: "actividad",
        component: ActividadIndividual,
        props: true,
      },
    ],
  },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
