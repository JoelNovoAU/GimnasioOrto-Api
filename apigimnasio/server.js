import "dotenv/config";
import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { enviarTelegram } from "./src/utils/telegram.js";

import { serve } from "inngest/express";
import { inngest } from "./src/inngest/cliente.js";
import { revisionActividadCadaHora } from "./src/inngest/revisionActividad.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DB_NAME = process.env.DB_NAME || "GimnasioOrto";
const MONGO_URI = process.env.MONGO_URI;
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-this";
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";

const client = new MongoClient(MONGO_URI);
let db;

const toSafeUser = (user) => ({
  id: user._id,
  nombre: user.nombre,
  apellido: user.apellido,
  correo: user.correo,
  telefono: user.telefono ?? "",
  rol: user.rol ?? "cliente",
});

const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      correo: user.correo,
      rol: user.rol ?? "cliente",
      nombre: user.nombre ?? "",
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

const authRequired = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, code: "AUTH_REQUIRED", mensaje: "Falta token Bearer" });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({ ok: false, code: "TOKEN_EXPIRED", mensaje: "Token expirado" });
    }
    return res.status(401).json({ ok: false, code: "INVALID_TOKEN", mensaje: "Token inv\u00e1lido" });
  }
};

try {
  await client.connect();
  db = client.db(DB_NAME);
  console.log("Conectado a MongoDB Atlas. DB:", db.databaseName);

  await db.collection("usuarios").createIndex({ correo: 1 }, { unique: true });
  console.log("Índice único creado/verificado: usuarios.correo");
} catch (e) {
  console.error("Error al conectar a MongoDB Atlas:", e);
}

app.get("/ping", (_req, res) => res.json({ ok: true, db: DB_NAME }));

app.post("/usuarios", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const { nombre, apellido, correo, telefono, contrasena } = req.body;

    if (!nombre || !apellido || !correo || !contrasena) {
      return res.status(400).json({ ok: false, mensaje: "Faltan campos obligatorios" });
    }
    if (String(contrasena).length < 8) {
      return res.status(400).json({ ok: false, mensaje: "La contraseña debe tener al menos 8 caracteres" });
    }

    // Salt expl\u00edcito: bcrypt genera salt aleatorio por usuario y luego hashea la contrase\u00f1a.
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const contrasenaHash = await bcrypt.hash(contrasena, salt);

    const nuevoUsuario = {
      nombre: String(nombre).trim(),
      apellido: String(apellido).trim(),
      correo: String(correo).trim().toLowerCase(),
      telefono: telefono ? String(telefono).trim() : "",
      contrasenaHash,
       rol: "cliente",
    };

    const resultado = await db.collection("usuarios").insertOne(nuevoUsuario);

    try {
      await enviarTelegram(
        `✅ Nuevo registro\n` +
          `${nuevoUsuario.nombre} ${nuevoUsuario.apellido}\n` +
          `${nuevoUsuario.correo}\n` +
          (nuevoUsuario.telefono ? `${nuevoUsuario.telefono}` : "")
      );
    } catch (err) {
      console.error("No se pudo enviar Telegram:", err.message);
    }

    return res.status(201).json({
      ok: true,
      mensaje: "Usuario creado correctamente",
      id: resultado.insertedId,
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, mensaje: "Ese correo ya está registrado" });
    }
    console.error("Error creando usuario:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
});
app.post("/auth/login", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ ok: false, mensaje: "Correo y contraseña son obligatorios" });
    }

    const user = await db.collection("usuarios").findOne({
      correo: String(correo).trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({ ok: false, mensaje: "Credenciales inválidas" });
    }

    const ok = await bcrypt.compare(String(contrasena), user.contrasenaHash);

    if (!ok) {
      return res.status(401).json({ ok: false, mensaje: "Credenciales inválidas" });
    }

    const usuario = toSafeUser(user);
    const accessToken = signAccessToken(user);

    return res.json({
      ok: true,
      mensaje: "Login correcto",
      usuario,
      accessToken,
      // Alias de compatibilidad solicitado por frontend legado.
      token: accessToken,
    });

  } catch (e) {
    console.error("Error en login:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
});

app.get("/actividades", authRequired, async (_req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const items = await db
      .collection("actividades")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const counts = await db
      .collection("reservas")
      .aggregate([{ $group: { _id: "$actividadId", total: { $sum: 1 } } }])
      .toArray();
    const map = new Map(counts.map((c) => [String(c._id), c.total]));

    const enriquecidas = items.map((a) => {
      const total = map.get(String(a._id)) || 0;
      const maximo = Number(a.maximoPersonas);
      const llena = Number.isFinite(maximo) && maximo > 0 ? total >= maximo : false;
      return { ...a, reservasCount: total, llena };
    });

    return res.json({ ok: true, actividades: enriquecidas });
  } catch (e) {
    console.error("Error GET /actividades:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});

app.post("/actividades", authRequired, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const { nombre, foto, descripcion, dia, hora, maximoPersonas } = req.body;

    if (req.auth?.rol !== "admin") {
      return res.status(403).json({ ok: false, mensaje: "No autorizado (solo admin)" });
    }

    if (!nombre || !descripcion) {
      return res.status(400).json({ ok: false, mensaje: "Faltan campos obligatorios" });
    }

    let maximo = null;
    if (maximoPersonas !== undefined && maximoPersonas !== null && String(maximoPersonas).trim() !== "") {
      const n = Number(maximoPersonas);
      if (!Number.isFinite(n) || n <= 0) {
        return res
          .status(400)
          .json({ ok: false, mensaje: "El máximo de personas debe ser un número válido" });
      }
      maximo = Math.floor(n);
    }

    const nueva = {
      nombre: String(nombre).trim(),
      foto: foto ? String(foto).trim() : "",
      descripcion: String(descripcion).trim(),
      dia: dia ? String(dia).trim() : "",
      hora: hora ? String(hora).trim() : "",
      maximoPersonas: maximo,
      createdAt: new Date(),
    };

    const r = await db.collection("actividades").insertOne(nueva);

    return res.status(201).json({ ok: true, id: r.insertedId, actividad: { ...nueva, _id: r.insertedId } });
  } catch (e) {
    console.error("Error POST /actividades:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});

app.put("/actividades/:id", authRequired, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const { id } = req.params;
    const { nombre, foto, descripcion, dia, hora, maximoPersonas } = req.body;

    if (req.auth?.rol !== "admin") {
      return res.status(403).json({ ok: false, mensaje: "No autorizado (solo admin)" });
    }

    if (!nombre || !descripcion) {
      return res.status(400).json({ ok: false, mensaje: "Faltan campos obligatorios" });
    }

    let maximo = null;
    if (maximoPersonas !== undefined && maximoPersonas !== null && String(maximoPersonas).trim() !== "") {
      const n = Number(maximoPersonas);
      if (!Number.isFinite(n) || n <= 0) {
        return res
          .status(400)
          .json({ ok: false, mensaje: "El máximo de personas debe ser un número válido" });
      }
      maximo = Math.floor(n);
    }

    const { ObjectId } = await import("mongodb");
    let oid;
    try {
      oid = new ObjectId(id);
    } catch {
      return res.status(400).json({ ok: false, mensaje: "ID inválido" });
    }

    const update = {
      nombre: String(nombre).trim(),
      foto: foto ? String(foto).trim() : "",
      descripcion: String(descripcion).trim(),
      dia: dia ? String(dia).trim() : "",
      hora: hora ? String(hora).trim() : "",
      maximoPersonas: maximo,
      updatedAt: new Date(),
    };

    const r = await db.collection("actividades").updateOne({ _id: oid }, { $set: update });
    if (!r.matchedCount) {
      return res.status(404).json({ ok: false, mensaje: "Actividad no encontrada" });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("Error PUT /actividades/:id:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});

app.delete("/actividades/:id", authRequired, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const { id } = req.params;

    if (req.auth?.rol !== "admin") {
      return res.status(403).json({ ok: false, mensaje: "No autorizado (solo admin)" });
    }

    const { ObjectId } = await import("mongodb");
    const r = await db.collection("actividades").deleteOne({ _id: new ObjectId(id) });

    return res.json({ ok: true, deletedCount: r.deletedCount });
  } catch (e) {
    console.error("Error DELETE /actividades/:id:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});

app.get("/actividades/:id", authRequired, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const { id } = req.params;
    const { ObjectId } = await import("mongodb");

    let oid;
    try {
      oid = new ObjectId(id);
    } catch {
      return res.status(400).json({ ok: false, mensaje: "ID inválido" });
    }

    const act = await db.collection("actividades").findOne({ _id: oid });
    if (!act) return res.status(404).json({ ok: false, mensaje: "Actividad no encontrada" });

    const total = await db.collection("reservas").countDocuments({ actividadId: oid });
    const maximo = Number(act.maximoPersonas);
    const llena = Number.isFinite(maximo) && maximo > 0 ? total >= maximo : false;

    return res.json({ ok: true, actividad: { ...act, reservasCount: total, llena } });
  } catch (e) {
    console.error("Error GET /actividades/:id:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});

app.get("/reservas", authRequired, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const uid = String(req.auth?.sub || "").trim();
    if (!uid) {
      return res.status(401).json({ ok: false, mensaje: "Token sin identificador de usuario" });
    }

    const reservas = await db
      .collection("reservas")
      .find({ usuarioId: uid })
      .project({ _id: 1, actividadId: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    const normalizadas = reservas.map((r) => ({
      id: r._id,
      actividadId: String(r.actividadId),
      createdAt: r.createdAt,
    }));

    return res.json({ ok: true, reservas: normalizadas });
  } catch (e) {
    console.error("Error GET /reservas:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});

app.post("/reservas", authRequired, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const { actividadId } = req.body;
    const usuarioId = String(req.auth?.sub || "").trim();
    if (!usuarioId) {
      return res.status(400).json({ ok: false, mensaje: "Usuario inválido" });
    }
    if (!actividadId) {
      return res.status(400).json({ ok: false, mensaje: "Actividad inválida" });
    }

    const { ObjectId } = await import("mongodb");
    let actOid;
    try {
      actOid = new ObjectId(actividadId);
    } catch {
      return res.status(400).json({ ok: false, mensaje: "ID de actividad inválido" });
    }

    const actividad = await db.collection("actividades").findOne({ _id: actOid });
    if (!actividad) {
      return res.status(404).json({ ok: false, mensaje: "Actividad no encontrada" });
    }

    const existente = await db.collection("reservas").findOne({ actividadId: actOid, usuarioId });
    if (existente) {
      return res.status(409).json({ ok: false, mensaje: "Ya tienes una reserva en esta actividad" });
    }

    const maximo = Number(actividad.maximoPersonas);
    if (Number.isFinite(maximo) && maximo > 0) {
      const total = await db.collection("reservas").countDocuments({ actividadId: actOid });
      if (total >= maximo) {
        return res.status(409).json({ ok: false, mensaje: "La actividad está completa" });
      }
    }

    const reserva = {
      actividadId: actOid,
      usuarioId,
      createdAt: new Date(),
    };
    const r = await db.collection("reservas").insertOne(reserva);

    return res.status(201).json({ ok: true, id: r.insertedId });
  } catch (e) {
    console.error("Error POST /reservas:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});

app.delete("/reservas", authRequired, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const { actividadId } = req.body;
    const usuarioId = String(req.auth?.sub || "").trim();
    if (!usuarioId) {
      return res.status(400).json({ ok: false, mensaje: "Usuario inválido" });
    }
    if (!actividadId) {
      return res.status(400).json({ ok: false, mensaje: "Actividad inválida" });
    }

    const { ObjectId } = await import("mongodb");
    let actOid;
    try {
      actOid = new ObjectId(actividadId);
    } catch {
      return res.status(400).json({ ok: false, mensaje: "ID de actividad inválido" });
    }

    const r = await db
      .collection("reservas")
      .deleteOne({ actividadId: actOid, usuarioId });

    if (!r.deletedCount) {
      return res.status(404).json({ ok: false, mensaje: "Reserva no encontrada" });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("Error DELETE /reservas:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});



app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [revisionActividadCadaHora],
    context: async () => ({ db }),
  })
);

app.listen(PORT, () => console.log(`API local en http://localhost:${PORT}`));
