import { fastify } from "fastify";
import { Client } from "whatsapp-web.js";
import chalk from "chalk";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import qrcode from "qrcode-terminal";
import { env } from "./common/env";

const app = fastify().withTypeProvider<ZodTypeProvider>();

function sendQrcode(qr: string) {
	app.get("/qr", async (request, reply) => {
		const generatedQrcode = qrcode.generate(qr, { small: true });
		return reply.status(200).send(generatedQrcode);
	});
}

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

const whatsappClient = new Client({});

whatsappClient.on("qr", (qr) => {
	console.log("QR CODE RECEIVED", qr);
	sendQrcode(qr);
});

whatsappClient.on("ready", () => {
	console.log("Client is ready!");
});

whatsappClient.on("message", (msg) => {
	const body = msg.body.trim().toLowerCase();
	if (body === "!ping") {
		msg.reply("pong");
	}
	if (body === "!lexsa") {
		msg.reply("te amo safada");
	}
});

app.listen({ port: env.PORT }, () => {
	console.log(chalk.greenBright("HTTP SERVER RUNNING!"));
});

whatsappClient.initialize();
