require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🧠 Conectado a MongoDB"))
    .catch(err => console.log("❌ Error Mongo:", err));

// modelo
const userSchema = new mongoose.Schema({
    numero: String,
    historial: [
        {
            role: String,   // "user" o "bot"
            content: String,
            fecha: { type: Date, default: Date.now }
        }
    ]
});

const User = mongoose.model("User", userSchema);

// endpoint principal
app.post('/mensaje', async (req, res) => {
    try {
        console.log("📩 BODY:", req.body);

        const numero = req.body.numero || req.body.from;
        const mensaje = req.body.mensaje || req.body.body;
        const respuestaIA = req.body.respuesta;

        if (!numero) {
            return res.json({ error: "Número no recibido" });
        }

        let usuario = await User.findOne({ numero });

        if (!usuario) {
            usuario = new User({ numero, historial: [] });
        }

        // ================================
        // 🟢 HTTP 1 → MENSAJE DEL USUARIO
        // ================================
        if (mensaje) {

            // guardar mensaje del usuario
            usuario.historial.push({
                role: "user",
                content: mensaje
            });

            await usuario.save();

            // construir contexto SIEMPRE válido
            let contexto = "";

            if (usuario.historial.length > 0) {
                const ultimos = usuario.historial.slice(-6);

                contexto = ultimos
                    .map(m => `${m.role === "user" ? "Cliente" : "Asesor"}: ${m.content}`)
                    .join("\n");
            } else {
                contexto = "Sin conversación previa";
            }

            // 🔥 IMPORTANTE: usar "response" para BuilderBot
            return res.json({
                response: `CONTEXTO:\n${contexto}\n\nMENSAJE:\n${mensaje}`
            });
        }

        // ================================
        // 🔵 HTTP 2 → RESPUESTA DE LA IA
        // ================================
        if (respuestaIA) {

            usuario.historial.push({
                role: "bot",
                content: respuestaIA
            });

            await usuario.save();

            return res.json({ ok: true });
        }

        return res.json({ error: "Sin datos válidos" });

    } catch (error) {
        console.log("❌ ERROR REAL:", error);
        return res.json({ error: "Error interno" });
    }
});

// iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Servidor corriendo en puerto", PORT);
});
