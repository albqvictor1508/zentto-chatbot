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
const BASE_URL = `${env.IXC_IP}/webservice/v1`;
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
		console.log();
		userStates.set(chatId, { step: 1, data: {} });
		return msg.reply(
			`${sayGrace(new Date())}, por favor, me informe o CPF cadastrado\n\n Se não possui cadastro, digite 1 para iniciar o seu cadastro`,
		);
		//verificar se existe cadastro na API do IXC pelo CPF
	}
	const { data: costumersList } = await axios.post(`${BASE_URL}/cliente`, {
		qtype: "cnpj_cpf",
		query: body,
		oper: "=",
		page: 1,
		rp: 5,
		sortname: "cliente.id",
		sortorder: "desc",
	});
	const costumerExists = costumersList.filter(
		(costumer) => costumer.cpf === body,
	);
	const userState = userStates.get(chatId);
	if (!userState) return;

	if (!costumerExists) {
		return msg.reply("O CPF que você me enviou realmente não existe");
		//perguntar se ele quer realizar o cadastro e verificar lá em cima antes de chegar aqui, se ele confirmou que quer
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
});

app.listen({ port: env.PORT }, () => {
	console.log(chalk.greenBright("HTTP SERVER RUNNING!"));
});

whatsappClient.initialize();
