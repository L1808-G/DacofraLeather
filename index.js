require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json()); // 👈 IMPORTANTE para recibir JSON

// conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🧠 Conectado a MongoDB"))
    .catch(err => console.log(err));

// modelo
const userSchema = new mongoose.Schema({
    numero: String,
    historial: [String]
});

const User = mongoose.model("User", userSchema);

// endpoint
app.post('/mensaje', async(req, res) => {
    try {
        console.log("BODY:", req.body);

        const numero = req.body.numero || req.body.user || "desconocido";
        const mensaje = req.body.mensaje || req.body.message || req.body.text;

        if (!mensaje) {
            return res.json({ respuesta: "No entendí el mensaje" });
        }

        let usuario = await User.findOne({ numero });

        if (!usuario) {
            usuario = new User({ numero, historial: [] });
        }

        usuario.historial.push(mensaje);
        await usuario.save();

        res.json({
            respuesta: `Recuerdo: ${usuario.historial.join(", ")}`
        });

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