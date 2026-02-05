import { serve } from "inngest/express";
import { inngest } from "./cliente.js";
import { revisionActividadCadaMinuto } from "./revisionActividad.js";

export default serve({
  client: inngest,
  functions: [revisionActividadCadaMinuto],
});
