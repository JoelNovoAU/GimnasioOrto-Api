import { inngest } from "./cliente.js";
import { enviarTelegram } from "../utils/telegram.js";

export const revisionActividadCadaHora = inngest.createFunction(
  { id: "revision-actividad-cada-hora" },
  {  cron: "*/1 * * * *", }, 
  async ({ step }) => {
    await step.run("enviar-telegram", async () => {
      await enviarTelegram(
        "⏰ Recordatorio automático\n" +
        "Revisá la gente que hay en la actividad del gimnasio."
      );
    });

    return { ok: true };
  }
);
