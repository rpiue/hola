const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Crea una nueva instancia del cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
});

// Cuando el cliente esté listo
client.on('ready', () => {
    console.log('¡Cliente listo!');
});

// Generar el QR para escanear
client.on('qr', (qr) => {
    // Generar el QR en la terminal
    qrcode.generate(qr, { small: true });
});

// Manejar mensajes entrantes
client.on('message', async (message) => {
    console.log(`Mensaje recibido: ${message.body}`);
    
    // Responder a un mensaje específico
    if (message.body === 'Hola') {
        client.sendMessage(message.from, '¡Hola! ¿Cómo puedo ayudarte?');
    }
});

// Inicia el cliente
client.initialize();

// Inicia el servidor Express
app.get('/', (req, res) => {
    res.send('<h1>Bot de WhatsApp está corriendo</h1>');
});

// Inicia el servidor en el puerto especificado
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
