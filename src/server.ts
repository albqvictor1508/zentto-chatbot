import {fastify} from "fastify";
import {Client} from "whatsapp-web.js"

const app = fastify();
const whatsappClient = new Client({});

whatsappClient.on("qr", (qr) => {
    console.log("QR CODE RECEIVED", qr);
})

whatsappClient.on("ready", () => {
    console.log("Client is ready!");
})