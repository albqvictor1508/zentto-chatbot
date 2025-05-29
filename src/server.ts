import { fastify } from "fastify";
import { Client } from "whatsapp-web.js";
import chalk from "chalk";
import { db } from "./db/client";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import qrcode from "qrcode-terminal";
import { env } from "./common/env";
import axios from "axios";

const app = fastify().withTypeProvider<ZodTypeProvider>();
const userStates = new Map();
const sayGrace = (date: Date): string => {
	const hour = date.getHours();
	if (hour >= 6 || hour < 12) return "Bom dia!";
	if (hour >= 12 || hour < 18) return "Boa tarde!";
	return "Boa noite!";
};

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

whatsappClient.on("message", async (msg) => {
	const chatId = msg.from;
	const body = msg.body.trim();
	if (body === "!ping") {
		msg.reply("pong");
	}

	if (body === "!care") {
		userStates.set(chatId, { step: 1, data: {} });
		msg.reply(`${sayGrace(new Date())} tudo certo por aí? 👋 Sou o Zentto, seu assistente virtual! Vamos resolver o que você precisa rapidinho. Como posso ajudar?

Aqui estão algumas opções para facilitar seu atendimento:

1️⃣ Verificar conexão de internet
2️⃣ Segunda via do boleto
3️⃣ Suporte técnico


🔁 Digite o número da opção desejada ou envie uma mensagem com sua dúvida.
		`);
		// 4️⃣ Falar com um atendente
	}

	const userState = userStates.get(chatId);
	if (!userState) return;
	if (userState.step > 1) return;
	switch (body) {
		case "1": {
			userState.step++;
			return msg.reply("essa msr ta pegando não");
		}
		case "2": {
			userState.step++;
			return msg.reply("R$ 0,01");
		}
		case "3": {
			userState.step++;
			return msg.reply("Suporte de cu é rola");
		}
		case "4": {
			userState.step++;
			return msg.reply("Me chamo Jalim Rabei e serei seu atendente!");
		}
		default: {
			//todo: colocar o chatgpt pra ler essa porra e analisar se alguma funcionalidade do chat resolve esse problema dele, senão, manda pro atendente
			return msg.reply("tomar no cu seu fudido");
		}
	}
});
whatsappClient.initialize();
