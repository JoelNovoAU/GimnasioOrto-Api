import { z } from "zod";

export const LoginPayloadSchema = z.object({
  correo: z.string().trim().email("Ingresa un correo valido"),
  contrasena: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
});

export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1).optional(),
  token: z.string().min(1).optional(),
  usuario: z.unknown().optional(),
  mensaje: z.string().optional(),
});

export const ActividadSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  nombre: z.string().min(1, "Falta nombre de actividad"),
  descripcion: z.string().min(1, "Falta descripcion de actividad"),
  foto: z.string().optional(),
});

export const ActividadResponseSchema = z.object({
  ok: z.boolean(),
  mensaje: z.string().optional(),
  actividad: ActividadSchema.optional(),
});

export const formatZodIssues = (error) => {
  if (!error?.issues?.length) return "Datos invalidos";
  return error.issues.map((issue) => issue.message).join(". ");
};
