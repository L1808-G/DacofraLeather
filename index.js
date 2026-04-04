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

// endpoint principal
app.post('/mensaje', async (req, res) => {
    try {
        console.log("📩 BODY:", req.body);

        const numero = req.body.numero || req.body.from;
        const mensaje = req.body.mensaje || req.body.body;
        const respuestaIA = req.body.respuesta;

        if (!numero) {
            return res.send("Error: número no recibido");
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

            // tomar últimos mensajes
            const ultimos = usuario.historial.slice(-8);

            let contexto = ultimos
                .map(m => `${m.role === "user" ? "Cliente" : "Asesor"}: ${m.content}`)
                .join("\n");

            if (!contexto) {
                contexto = "Sin conversación previa";
            }

            // 🔥 RESPUESTA EN TEXTO PLANO (CLAVE)
            return res.send(`
Eres Erick, asesor de ventas.

Tienes memoria de la conversación y DEBES usarla.

Historial:
${contexto}

Mensaje actual del cliente:
${mensaje}

INSTRUCCIONES:
- Usa el historial para responder
- NO digas que no tienes información si sí la hay
- NO repitas preguntas ya respondidas
- Responde natural, sin sonar robot
`);
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

            return res.send("ok");
        }

        return res.send("Sin datos válidos");

    } catch (error) {
        console.log("❌ ERROR REAL:", error);
        return res.send("Error interno");
    }
});

// iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Servidor corriendo en puerto", PORT);
});
