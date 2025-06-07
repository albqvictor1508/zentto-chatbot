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
import { z } from "zod";

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
	if (msg.from.includes("@g.us") || msg.from === "status@broadcast") {
		return;
	}

	if (body === "!ping") {
		msg.reply("pong");
	}

	if (body === "!care") {
		userStates.set(chatId, { step: 1, data: {} });
		return msg.reply(`${sayGrace(new Date())} 👋, Sou o Zentto, seu assistente virtual! Vamos resolver o que você precisa rapidinho. Como posso ajudar?

Antes de começarmos, digite o CPF no qual está ligada ao plano de internet, e se ainda não é um cliente, digite 1
		`);
	}

	const userState = userStates.get(chatId);
	if (!userState) return;

	switch (userState.step) {
		case 1: {
			switch (body) {
				case "1": {
					userState.step++;
					return msg.reply(`Quer fazer plano com nois paizão
R$ 89,90 por 2KB de internet!
				`);
				}
				default: {
					try {
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
						if (!userExists)
							return msg.reply(
								`Não existe nenhum cliente cadastrado com esse CPF

								Envie um CPF novamente ou digite 1 para realizar cadastro
								`,
							);
						userState.step++;

						return "";
					} catch (error) {
						console.error(error);
						throw error;
					}
				}
			}
		}
		case 2: {
			switch (body) {
				case "1": {
					userState.step++;
					return msg.reply(`
						Irei de passar para o atendente. tchau
						`);
				}
			}
		}
	}
});
whatsappClient.initialize();
