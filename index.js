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
            role: String,
            content: String,
            fecha: { type: Date, default: Date.now }
        }
    ]
});

const User = mongoose.model("User", userSchema);

// limpiar número
function limpiarNumero(numero) {
    if (!numero) return "desconocido";
    return numero.toString().replace(/[^\d]/g, "");
}

// endpoint
app.post('/mensaje', async (req, res) => {
    try {
        console.log("📩 BODY:", req.body);

        let numero = req.body.numero || req.body.from;
        const mensaje = req.body.mensaje || req.body.body;
        const respuestaIA = req.body.respuesta;

        numero = limpiarNumero(numero);

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

            // guardar mensaje usuario
            usuario.historial.push({
                role: "user",
                content: mensaje
            });

            await usuario.save();

            // 🔥 construir history en formato que BuilderBot entiende
            const history = usuario.historial.slice(-10).map(m => ({
                role: m.role,
                content: m.content
            }));

            return res.json({
                history: history,
                current_message: mensaje
            });
        }

        // ================================
        // 🔵 HTTP 2 → RESPUESTA IA
        // ================================
        if (respuestaIA) {

            if (respuestaIA && respuestaIA.trim() !== "") {
                usuario.historial.push({
                    role: "bot",
                    content: respuestaIA
                });

                await usuario.save();
            }

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
