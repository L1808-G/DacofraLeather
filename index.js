require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🧠 Conectado a MongoDB"))
    .catch(err => console.log("❌ Error Mongo:", err));

// 🔥 Schema ORIGINAL + TTL
const userSchema = new mongoose.Schema({
    numero: String,
    expireAt: { 
        type: Date, 
        default: () => new Date(Date.now() + 7*24*60*60*1000) 
    },
    historial: [
        {
            role: String,
            content: String,
            fecha: { type: Date, default: Date.now }
        }
    ]
});

// ⏳ TTL automático
userSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

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
            usuario = new User({ numero, historial: [] });
        }

        // 🟢 PRIORIDAD: MENSAJE DEL USUARIO
        if (mensaje) {

            usuario.historial.push({
                role: "user",
                content: mensaje
            });

            usuario.expireAt = new Date(Date.now() + 7*24*60*60*1000);

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

        // 🔵 RESPUESTA IA (secundario)
        if (respuestaIA !== undefined) {

            if (respuestaIA && respuestaIA.trim() !== "" && respuestaIA !== ".") {
                usuario.historial.push({
                    role: "bot",
                    content: respuestaIA
                });

                usuario.expireAt = new Date(Date.now() + 7*24*60*60*1000);

                await usuario.save();
                console.log("✅ Guardado BOT:", respuestaIA);
            } else {
                console.log("⚠️ Respuesta IA ignorada:", respuestaIA);
            }

            return res.json({ ok: true });
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
