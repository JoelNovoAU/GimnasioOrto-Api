import "./assets/main.css";
import { createApp } from "vue";
import App from "./login.vue";
import router from "./router/index.js";

createApp(App).use(router).mount("#app");
