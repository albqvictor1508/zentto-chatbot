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
import { env } from "./common/env";

const app = fastify().withTypeProvider<ZodTypeProvider>();
const userStates = new Map();
const sayGrace = (date: Date): string => {
	const hour = date.getHours();
	if (hour >= 6 || hour < 12) return "Bom dia!";
	return "Boa tarde!";
};

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

const whatsappClient = new Client({ authStrategy: new LocalAuth() });

whatsappClient.on("qr", (qr) => {
	console.log("QR CODE RECEIVED", qr);
	qrcode.generate(qr, { small: true });
});

whatsappClient.on("ready", () => {
	console.log("Client is connected!");
});

whatsappClient.on("message", async (msg) => {
	const chatId = msg.from;
	const body = msg.body.trim();
	if (body === "!ping") {
		msg.reply("pong");
	}

	if (body === "!care") {
		userStates.set(chatId, { step: 1, data: {} });
		return msg.reply(`${sayGrace(new Date())} tudo certo por aí? 👋 Sou o Zentto, seu assistente virtual! Vamos resolver o que você precisa rapidinho. Como posso ajudar?

Aqui estão algumas opções para facilitar seu atendimento:

1️⃣ Verificar conexão de internet
2️⃣ Segunda via do boleto
3️⃣ Suporte técnico
4️⃣ Falar com um atendente

🔁 Digite o número da opção desejada ou envie uma mensagem com sua dúvida.
		`);
	}

	const userState = userStates.get(chatId);
	if (!userState) return;
	if (userState.step > 1) {
		return;
	}
	switch (body) {
		case "1": {
			userState.step++;
			try {
				const query = await axios.get(`${env.IXC_HOST}/cliente`, {
					data: {
						qtype: "cnpj_cpf",
						query: "115.895.877-31",
						oper: "=",
						page: "1",
						rp: "20",
						sortname: "cliente.id",
						sortorder: "desc",
					},
				});
			} catch (error) {
				console.error(chalk.bgWhite(`ERROR MESSAGE: ${error}`));
				throw error;
			}

			return msg.reply("teste numero 1");
		}
		case "2": {
			userState.step++;
			return msg.reply("aqui está sua segunda via do boleto");
		}
		case "3": {
			userState.step++;
			return msg.reply("Suporte técnico agility");
		}
		case "4": {
			userState.step++;
			return msg.reply("falando com o atendente agility");
		}
		default: {
			//todo: colocar o chatgpt pra ler essa porra e analisar se alguma funcionalidade do chat resolve esse problema dele, senão, manda pro atendente
			return msg.reply("mensagem automática do bot ");
		}
	}
});
whatsappClient.initialize();
