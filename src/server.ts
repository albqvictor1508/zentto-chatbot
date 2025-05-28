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
	if (body === "!ping") {
		msg.reply("pong");
	}

	if (body === "!care") {
		console.log();
		userStates.set(chatId, { step: 1, data: {} });
		return msg.reply("salve, me manda seu nome!");
	}
	const userState = userStates.get(chatId);

	if (userState) {
		switch (userState.step) {
			case 1: {
				userState.data.name = body;
				userState.step = 2;
				return msg.reply("Legal, agora me diga sua cidade!");
			}
			case 2: {
				userState.data.city = body;
				userState.step = 3;

				return msg.reply(
					"Beleza! Qual serviço você deseja?\n\n 1 - Instalação\n2 - Relatar Problema",
				);
			}
			case 3: {
				switch (body) {
					case "1": {
						return msg.reply("vai instalar nd não viado");
					}
					case "2": {
						return msg.reply(
							`Ainda bem que o problema é teu Sr. ${userState.data.name} KASKDAKSDKADKASDKASDKSKD`,
						);
					}
				}
				userState.data.service = body;
				userState.step = 4;
				return msg.reply(`Cadastro finalizado Sr. ${userState.data.name}!`);
			}
		}
		userStates.delete(userState);
	}
});

app.listen({ port: env.PORT }, () => {
	console.log(chalk.greenBright("HTTP SERVER RUNNING!"));
});

whatsappClient.initialize();
