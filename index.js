require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🧠 Conectado a MongoDB"))
    .catch(err => console.log(err));

// modelo mejorado
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
        console.log("BODY:", req.body);

        const numero = req.body.numero || req.body.from || "desconocido";
        const mensaje = req.body.mensaje || req.body.body;

        if (!mensaje) {
            return res.json({ respuesta: "No entendí el mensaje" });
        }

        let usuario = await User.findOne({ numero });

        // 🧠 detectar si es nuevo
        let esNuevo = false;

        if (!usuario) {
            usuario = new User({ numero, historial: [] });
            esNuevo = true;
        }

        // 🔥 guardar mensaje del usuario
        usuario.historial.push({
            role: "user",
            content: mensaje
        });

        // 🧠 lógica de respuesta
        let respuesta;

        if (esNuevo) {
            respuesta = "Hola 👋, soy Erick, asesor de ventas. ¿Con quién tengo el gusto?";
        } else {
            // tomar últimos mensajes para contexto (máx 5)
            const ultimos = usuario.historial.slice(-5)
                .map(m => m.content)
                .join(" | ");

            respuesta = `Perfecto, seguimos 👍`;
        }

        // 🔥 guardar respuesta del bot
        usuario.historial.push({
            role: "bot",
            content: respuesta
        });

        await usuario.save();

        return res.json({ respuesta });

    } catch (error) {
        console.log("ERROR REAL:", error);
        res.json({ respuesta: "Error interno" });
    }
});

// iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Servidor corriendo en puerto", PORT);
});
