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

whatsappClient.on("ready", async () => {
	console.log("Client is connected!");
	try {
		const query = await axios.request({
			method: "GET",
			url: "/cliente",
			data: {
				qtype: "cliente.id",
				query: "1",
				oper: ">=",
				page: "1",
				rp: "19",
				sortname: "cliente.id",
				sortorder: "desc",
			},
		});
		console.log(query);
	} catch (error) {
		console.error(chalk.bgWhite(`ERROR MESSAGE: ${error}`));
		throw error;
	}
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

Antes de começarmos, digite o CPF no qual está ligada ao plano de internet, e se ainda não é um cliente, digite 1
		`);
	}

	const userState = userStates.get(chatId);
	if (!userState) return;
	if (userState.step > 1) {
		return;
	}
	switch (body) {
		case "1": {
			return msg.reply(`Quer fazer plano com nois paizão
R$ 89,90 por 2KB de internet!
				`);
		}
		default: {
			userState.step++;
			const query = await axios.request({
				method: "get",
				url: "/cliente",
				data: {
					qtype: "cnpj_cpf",
					query: "13606308485",
					oper: ">",
					page: "1",
					rp: 20,
					sortname: "cliente.id",
					sortorder: "desc",
				},
			});
			console.log(query);
			//exemplo
			const userExists = query.data.filter((u) => u.cpf) || "";
			if (!userExists) {
				return msg.reply("");
			}
			return "";
		}
	}
});
whatsappClient.initialize();
