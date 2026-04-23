require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🧠 Conectado a MongoDB"))
    .catch(err => console.log("❌ Error Mongo:", err));

// 🔥 Schema con control de actividad
const userSchema = new mongoose.Schema({
    numero: String,
    lastActivity: { type: Date, default: Date.now }, // 👈 clave TTL
    historial: [
        {
            role: String,
            content: String,
            fecha: { type: Date, default: Date.now }
        }
    ]
});

// ⏳ TTL: eliminar usuario tras 7 días (604800 segundos)
userSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 604800 });

const User = mongoose.model("User", userSchema);

function limpiarNumero(numero) {
    if (!numero) return "desconocido";
    return numero.toString().replace(/[^\d]/g, "");
}

app.post('/mensaje', async (req, res) => {
    try {
        console.log("📩 BODY:", req.body);

        let numero = limpiarNumero(req.body.numero || req.body.from);

        const mensaje = req.body.mensaje || req.body.body;
        const respuestaIA = req.body.respuesta;

        let usuario = await User.findOne({ numero });

        if (!usuario) {
            usuario = new User({ 
                numero, 
                historial: [],
                lastActivity: new Date()
            });
        }

        // 🔵 RESPUESTA IA
        if (respuestaIA && respuestaIA.trim() !== "" && respuestaIA !== ".") {

            if (respuestaIA && respuestaIA.trim() !== "" && respuestaIA !== ".") {
                usuario.historial.push({
                    role: "bot",
                    content: respuestaIA
                });

                usuario.lastActivity = new Date(); // 👈 actualizar actividad

                await usuario.save();
                console.log("✅ Guardado BOT:", respuestaIA);
            } else {
                console.log("⚠️ Respuesta IA ignorada:", respuestaIA);
            }

            return res.json({ ok: true });
        }

        // 🟢 MENSAJE DEL USUARIO
        if (mensaje) {

            usuario.historial.push({
                role: "user",
                content: mensaje
            });

            usuario.lastActivity = new Date(); // 👈 actualizar actividad

            await usuario.save();

            const history = usuario.historial.slice(-10).map(m => ({
                role: m.role,
                content: m.content
            }));

            console.log("🧠 HISTORIAL ENVIADO:", history);

            return res.json({
                history: history,
                current_message: mensaje
            });
        }

        return res.json({ error: "Sin datos válidos" });

    } catch (error) {
        console.log("❌ ERROR REAL:", error);
        return res.json({ error: "Error interno" });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Servidor corriendo en puerto", PORT);
});
