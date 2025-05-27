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
const userStates = new Map();

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

const whatsappClient = new Client({});

whatsappClient.on("qr", (qr) => {
	console.log("QR CODE RECEIVED", qr);
	qrcode.generate(qr, { small: true });
});

whatsappClient.on("ready", () => {
	console.log("Client is ready!");
});

whatsappClient.on("message", (msg) => {
	const chatId = msg.from;
	const body = msg.body.trim();
	const userState = userStates.get(chatId);
	if (body === "!ping") {
		msg.reply("pong");
	}

	if (!userState) {
		userStates.set(chatId, { step: 1, data: {} });
		return msg.reply("Olá, Vamos fazer seu cadastro. Qual o seu nome?");
	}

	switch (userState.step) {
		case 1: {
			userState.data.name = body;
			userState.step = 2;
			return msg.reply("Legal, agora me diga sua cidade!");
		}
		case 2: {
			userState.data.city = body;
			userState.step = 3;
			return msg.reply("Beleza! Qual serviço você deseja?");
		}
		case 3: {
			userState.data.service = body;
			userState.step = 4;
			return msg.reply(`Cadastro finalizado Sr. ${userState.data.name}!`);
		}
	}
});

app.listen({ port: env.PORT }, () => {
	console.log(chalk.greenBright("HTTP SERVER RUNNING!"));
});

whatsappClient.initialize();
