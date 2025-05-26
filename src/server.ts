import { fastify } from "fastify";
import { Client } from "whatsapp-web.js";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

const whatsappClient = new Client({});

whatsappClient.on("qr", (qr) => {
	console.log("QR CODE RECEIVED", qr);
});

whatsappClient.on("ready", () => {
	console.log("Client is ready!");
});

whatsappClient.on("message", (msg) => {
	const body = msg.body.trim().toLowerCase();
	if (msg.body === "!ping") {
		msg.reply("pong");
	}
});

whatsappClient.initialize();
