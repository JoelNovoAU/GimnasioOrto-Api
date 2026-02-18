import { z } from "zod";

export const LoginPayloadSchema = z.object({
  correo: z.string().trim().email("Ingresa un correo valido"),
  contrasena: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
});

export const ActividadSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  nombre: z.string().min(1, "Falta nombre de actividad"),
  descripcion: z.string().min(1, "Falta descripcion de actividad"),
  foto: z.string().optional(),
});

export const formatZodIssues = (error) => {
  if (!error?.issues?.length) return "Datos invalidos";
  return error.issues.map((issue) => issue.message).join(". ");
};
