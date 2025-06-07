import { fastify } from "fastify";
import { Client, LocalAuth } from "whatsapp-web.js";
import chalk from "chalk";
import axios from "./db/axios";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import qrcode from "qrcode-terminal";
import type { ChatData } from "./types/chat";

const app = fastify().withTypeProvider<ZodTypeProvider>();
const userStates = new Map<string, ChatData>();
const sayGrace = (date: Date): string => {
	const hour = date.getHours();
	if (hour >= 6 || hour < 12) return "Bom dia!";
	return "Boa tarde!";
};

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

const whatsappClient = new Client({ authStrategy: new LocalAuth() });

whatsappClient.on("qr", (qr) => {
	try {
		console.log("QR CODE RECEIVED", qr);
	} catch (error) {
		console.error(error);
		throw error;
	}
	qrcode.generate(qr, { small: true });
});

whatsappClient.on("ready", async () => {
	try {
		console.log("Client is connected!");
	} catch (error) {
		console.log(error);
		throw error;
	}
});
whatsappClient.on("message", async (msg) => {
	const chatId = msg.from;
	const body = msg.body.trim();
	let userState: ChatData | undefined;
	if (body === "!care") {
		userState = userStates.get(chatId);
		return msg.reply(`
${sayGrace(new Date())}, Sou o assistente virtual da *Agility Telecom*, Antes de começarmos, peço que digite seu *CPF* para identificarmos você, ou digite *1* se deseja saber mais sobre nosso serviço! 
			`);
	}

	if (!userState) return;
	while (true) {
		switch (userState.step) {
			case 1: {
				if (body === "1") {
					return msg.reply(`
A Agility é tarara tarara, fornecemos planos desde *R$ 60,00* ${"à"} *R$ 80,00*, fornecemos serviços nas regiões de parara parara

1 - Realizar cadastro
2 - ir tomar no cu
						`);
				}
				return "";
			}
			case 2: {
				return "";
			}

			case 3: {
				return "";
			}
		}
	}
});

whatsappClient.on("disconnected", (reason) => {
	console.log(chalk.yellow("WhatsApp Client disconnected:"), reason);
});

whatsappClient.on("auth_failure", (message) => {
	console.error(chalk.red("Authentication failed:"), message);
});

whatsappClient.initialize();
