import "dotenv/config";
import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import bcrypt from "bcrypt";
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

const client = new MongoClient(MONGO_URI);
let db;

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

    const contrasenaHash = await bcrypt.hash(contrasena, 10);

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

    return res.json({
  ok: true,
  mensaje: "Login correcto",
  usuario: {
    id: user._id,
    nombre: user.nombre,
    apellido: user.apellido,
    correo: user.correo,
    telefono: user.telefono ?? "",
    rol: user.rol ?? "cliente", 
  },
});

  } catch (e) {
    console.error("Error en login:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
});

app.get("/actividades", async (_req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const items = await db
      .collection("actividades")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({ ok: true, actividades: items });
  } catch (e) {
    console.error("Error GET /actividades:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});

app.post("/actividades", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const { nombre, foto, descripcion, usuario } = req.body;

    if (!usuario || usuario.rol !== "admin") {
      return res.status(403).json({ ok: false, mensaje: "No autorizado (solo admin)" });
    }

    if (!nombre || !descripcion) {
      return res.status(400).json({ ok: false, mensaje: "Faltan campos obligatorios" });
    }

    const nueva = {
      nombre: String(nombre).trim(),
      foto: foto ? String(foto).trim() : "",
      descripcion: String(descripcion).trim(),
      createdAt: new Date(),
    };

    const r = await db.collection("actividades").insertOne(nueva);

    return res.status(201).json({ ok: true, id: r.insertedId, actividad: { ...nueva, _id: r.insertedId } });
  } catch (e) {
    console.error("Error POST /actividades:", e);
    return res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});

app.delete("/actividades/:id", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ ok: false, mensaje: "DB no disponible" });

    const { id } = req.params;
    const { usuario } = req.body;

    if (!usuario || usuario.rol !== "admin") {
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

app.get("/actividades/:id", async (req, res) => {
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

    return res.json({ ok: true, actividad: act });
  } catch (e) {
    console.error("Error GET /actividades/:id:", e);
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
