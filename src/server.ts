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
import { Block, type ChatData } from "./types/chat";

const app = fastify().withTypeProvider<ZodTypeProvider>();
const userStates = new Map<string, ChatData>();
const formatCpf = (cpf) => {
	return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};
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
	if (msg.from.includes("@g.us") || msg.from === "status@broadcast") return;

	if (body === "!ping") {
		return msg.reply("pong");
	}

	if (body === "!care") {
		userStates.set(chatId, { step: 1, data: {} });
		return msg.reply(`${sayGrace(new Date())} 👋, Sou o *Zentto*, seu assistente virtual! Vamos resolver o que você precisa rapidinho. Como posso ajudar?

Antes de começarmos, digite o CPF no qual está ligada ao plano de internet, e se ainda não é um cliente, digite 1
		`);
	}

	const userState = userStates.get(chatId);
	if (!userState) return;

	switch (userState.step) {
		case 1: {
			if (body === "1") {
				userState.step++;
				return msg.reply(`
Quer fazer plano com nois paizão, R$ 89,90 por 2KB de internet!
							`);
			}
			const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
			if (!cpfRegex.test(body))
				return msg.reply(`
CPF inválido, tente novamente ou digite *1* para realizar um novo cadastro!
				`);
			const cpfValidated = formatCpf(body);
			const { data } = await axios.request({
				method: "get",
				url: "/cliente",
				data: {
					qtype: "cnpj_cpf",
					query: cpfValidated,
					oper: "=",
					page: "1",
					rp: 5,
					sortname: "cliente.id",
					sortorder: "desc",
				},
			});
			console.log(data.registros ? data.registros.length : "não tem");
			console.log("CPF VALIDATED: %s", cpfValidated);
			//exemplo
			if (!data.registros)
				return msg.reply(`
Não existe nenhum cliente cadastrado com esse CPF, Envie um CPF novamente ou digite 1 para realizar cadastro
			 			`);
			userState.data.cpf = cpfValidated;
			return msg.reply(`
Olá, [NOME_DO_CLIENTE]! Como posso ajudar?

1 - Analisar status financeiro.
2 - Status da minha internet.
3 - Falar com atendente.

Digite o número da opção desejada.
`);
		}
		case 2: {
			if (body === "1") {
				userState.data.block = Block.ONE;
				userState.step++;
				return msg.reply(`
				BLOCO DE ANALISAR STATUS FINANCEIRO!

				1 - Segunda via do boleto. 
				2 - Confirmar pagamento.
					`);
				// 1: Se tiver um só boleto, retorna esse boleto em PDF, se tiver mais de um, lista os boleto e pergunta qual ele quer pagar
				// 2: Se tiver um só boleto, confirma de cara se foi pago, senão, lista os boletos e pergunta qual ele pagou
				//e nois dois, ter um tratamento caso não haja nenhum boleto em aberto
			}
			if (body === "2") {
				userState.step++;
				userState.data.block = Block.TWO;
				//simples, só preciso saber como posso fazer essa query pra api do ixc
				return msg.reply("Bloco de ver o status da internet");
			}

			userState.data.block = Block.THREE;
			userState.step++;
			if (body === "3") {
				return msg.reply("Bloco de falar com o atendente");
			}
			return msg.reply("É nois cara, vou te passar pro atendimento");
		}
		case 3: {
			userState.step++;
			if (userState.data.block === Block.ONE) {
				if (body === "1") {
					return msg.reply("Lógica de segunda via do boleto");
				}
				if (body === "2") {
					return msg.reply("Lógica de confirmar pagamento");
				}
			}

			if (userState.data.block === Block.TWO) {
				return msg.reply("Lógica de verificar status da internet");
			}

			if (userState.data.block === Block.THREE) {
				return msg.reply("Lógica de chamar atendente");
			}
			return "";
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
