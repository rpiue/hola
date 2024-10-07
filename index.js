const qrcode = require("qrcode-terminal");
const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const puppeteer = require("puppeteer");
const express = require("express");

let client;
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Función asíncrona para inicializar el cliente
async function initializeClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      // Aquí no utilizamos `await` sino que simplemente llamamos al método
      executablePath: puppeteer.executablePath(), // Usa la versión de Chromium
    },
  });

  // Manejo de eventos del cliente
  client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
    io.emit("qr", qr);
  });

  client.on("ready", () => {
    console.log("Cliente listo para enviar mensajes.");
    io.emit("ready");
  });

  // Inicializar el cliente
  await client.initialize();
  return client;
}

// Inicializar el cliente
initializeClient().catch(error => console.error('Error al inicializar el cliente:', error));


// Configurar el servidor para servir archivos estáticos
app.use(express.static("public"));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html"); // Archivo HTML para mostrar el QR
});

// Variables para controlar el envío de mensajes
let envioActivo = false;


async function leerNumerosDesdeUrl(urlArchivo) {
  const response = await axios.get(urlArchivo); // Obtener el archivo desde la URL
  return response.data
    .split("\n")
    .map((linea) => {
      const [nombre, numero] = linea.split(",").map((item) => item.trim());
      return { nombre, numero };
    })
    .filter((contacto) => contacto.numero); // Filtrar contactos válidos
}

// Función para enviar mensajes a la lista de números
async function enviarMensajes(url, numeroParaContinuar) {
  const contactos = await  leerNumerosDesdeUrl(url); // Lee los números del archivo
  console.log(contactos);
  const imagen = MessageMedia.fromFilePath("promocion.png"); // Ruta a la imagen
  const posicionInicio = encontrarPosicion(contactos, numeroParaContinuar) + 1;

  if (posicionInicio === -1) {
    console.log(
      `El número ${numeroParaContinuar} no se encuentra en la lista.`
    );
    return;
  }

  // Iniciar desde la posición encontrada
  for (let i = posicionInicio; i < contactos.length && envioActivo; i++) {
    const { nombre, numero } = contactos[i];
    const numeroConCodigo = `51${numero}@c.us`; // Formato correcto del número con código de país

    // Mensaje personalizado
    const mensajePersonalizado = crearMensajePersonalizado(nombre);

    try {
      // Verificar si el número tiene cuenta en WhatsApp
      const contacto = await client.getContactById(numeroConCodigo);
      if (!contacto.isBusiness && !contacto.isUser) {
        console.log(`El número ${numero} no tiene cuenta en WhatsApp.`);
        continue; // Continúa con el siguiente número en la lista
      }

      // Enviar la imagen
      await client.sendMessage(numeroConCodigo, imagen);
      console.log(`Imagen enviada a ${nombre} (${numero})`);

      // Esperar un poco entre el envío de imagen y mensaje
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Enviar el mensaje de texto personalizado
      await client.sendMessage(numeroConCodigo, mensajePersonalizado);
      console.log(`Mensaje enviado a ${nombre} (${numero})`);
      io.emit("messageSent", nombre, numero);

      // Esperar 5 segundos entre envíos para no saturar el sistema
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`Error enviando a ${nombre} (${numero}):`, error);
    }
  }

  console.log("Todos los mensajes han sido enviados.");
}

// Función para crear un mensaje personalizado
function crearMensajePersonalizado(nombre) {
  return (
    `¡Hola, ${nombre}! 👋 Soy CodexPE\n` +
    `¿Qué pasó? ¿Por qué dejaste de usar la app Yape Fake? 😕\n\n` +
    `¡Ya hay una nueva versión mejorada! 🚀\n\n` +
    `Hemos implementado una tienda virtual 🛒 para que puedas comprar con seguridad y garantía. 🛡️\n\n` +
    `*Importante:*\n\nEl *20 de octubre* habrá una eliminación de cuentas que no hayan actualizado la app. ⚠️\n\n` +
    `No te pierdas de la app más realista y económica del mercado.\n\n *Instala la nueva versión aquí:* \n` +
    `https://www.mediafire.com/file/676d35gs8ij0mrb/Yape-Fake.apk/file\n\n` +
    `_¡Estamos seguros de que te encantará!_ ❤️`
  );
}

// Buscar la posición del número específico en la lista
function encontrarPosicion(contactos, numeroEspecifico) {
  return contactos.findIndex(
    (contacto) => contacto.numero === numeroEspecifico
  );
}

// Inicializa el cliente
client.initialize();

// Escuchar eventos del cliente para iniciar y detener el envío
io.on("connection", (socket) => {
  socket.on("iniciar-envio", (url, numeroParaContinuar) => {
    envioActivo = true; // Activar el envío
    enviarMensajes(url, numeroParaContinuar); // Iniciar el envío de mensajes
  });

  socket.on("empezar-de-cero", async (url) => {
    envioActivo = true; // Activar el envío
    const numeroParaContinuar = ""; // Empezar desde el principio (vacío)
    await enviarMensajes(url, numeroParaContinuar); // Iniciar el envío de mensajes desde el primer número
  });

  socket.on("detener-envio", () => {
    envioActivo = false; // Desactivar el envío
    console.log("El envío de mensajes ha sido detenido.");
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor en ejecución en http://localhost:${PORT}`);
});
