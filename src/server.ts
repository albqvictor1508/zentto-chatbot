import { fastify } from "fastify";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import chalk from "chalk";
import axios from "./db/axios";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import qrcode from "qrcode-terminal";
import { Block, ChatState, type ChatData } from "./types/chat";
import { getBillets } from "./functions/get-billets";

const app = fastify().withTypeProvider<ZodTypeProvider>();
const userStates = new Map<string, ChatData>();

const formatCpf = (cpf: string) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const sayGrace = (date: Date): string => {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return "Bom dia!";
  return "Boa tarde!";
};
const ACTUAL_DATE = new Date();
const THREE_MONTHS_LATER = new Date(ACTUAL_DATE);
THREE_MONTHS_LATER.setMonth(ACTUAL_DATE.getMonth() + 3);

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

const whatsappClient = new Client({ authStrategy: new LocalAuth() });

whatsappClient.on("qr", (qr: string) => {
  console.log(qr);
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
whatsappClient.on("message", async (msg: Message): Promise<Message | undefined> => {
  const chatId = msg.from;
  const body = msg.body.trim();

  if (chatId !== "120363420137790776@g.us") return; // WARN: APAGAR ISSO DEPOIS

  if (body === "!care") {
    const context: ChatData = {
      state: ChatState.AWAITING_CPF,
      data: {},
      currentStateData: {}
    }
    userStates.set(chatId, context);
    return msg.reply(`${sayGrace(new Date())} 👋, Sou o *Zentto*, seu assistente virtual! Vamos resolver o que você precisa rapidinho. Como posso ajudar?

Antes de começarmos, digite o CPF no qual está ligada ao plano de internet, e se ainda não é um cliente, digite 1
		`);
  }

  const userState = userStates.get(chatId);
  if (!userState) return;

  switch (userState.state) {
    case ChatState.AWAITING_CPF: {
      try {
        if (body === "1") {
          userState.state = ChatState.AWAITING_MAIN_MENU_CHOICE;
          return msg.reply(
            "Quer fazer plano com nois paizão, R$ 89,90 por 2KB de internet!",
          );
        }
        const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

        if (!cpfRegex.test(body))
          return msg.reply(
            "CPF inválido, tente novamente ou digite *1* para realizar um novo cadastro!",
          );
        const cpfValidated = formatCpf(body);
        const { data } = await axios.request({
          method: "get",
          url: "/cliente",
          data: {
            qtype: "cnpj_cpf",
            query: cpfValidated,
            oper: "=",
            page: "1",
            rp: "1", //WARN: DIMINUIR ISSO OU REFATORAR LÁ EMBAIXO PRA N USAR "registros[0]"
            sortname: "cliente.id",
            sortorder: "desc",
          },
        });

        if (!data.registros)
          return msg.reply(
            "Não existe nenhum cliente cadastrado com esse CPF, Envie um CPF novamente ou digite 1 para realizar cadastro",
          );
        userState.data.cpf = cpfValidated;
        userState.data.name = data.registros[0].fantasia;
        userState.data.id = data.registros[0].id;
        userState.state = ChatState.AWAITING_MAIN_MENU_CHOICE;
        return msg.reply(`
Olá ${userState.data.name}, Como posso ajudar ?

1 - Analisar status financeiro.
2 - Status da minha internet.
3 - Falar com atendente.

Digite o número da opção desejada.
`);
      } catch (error) {
        console.error(error);
        return msg.reply("Erro no bot");
      }
    }
    case ChatState.FINANCIAL_AWAITING_SUBMENU_CHOICE: {
      if (body === "1") {
        userState.state = ChatState.FINANCIAL_AWAITING_SUBMENU_CHOICE;
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
        userState.state = ChatState.INTERNET_STATUS_REQUESTED;
        //simples, só preciso saber como posso fazer essa query pra api do ixc
        const { data: contractData } = await axios.request({
          method: "get",
          url: "/radusuarios",
          data: {
            qtype: "radusuarios.id",
            query: userState.data.id,
            oper: "=",
            page: "1",
            rp: "200000",
            sortname: "radusuarios.id",
            sortorder: "desc"
          }
        })

        // pego o id do contrato por essa rota de cima, jogo na rota de baixo e pego o status e se ele tá online

        /*
    'ativo' => 'S',
    'online' => 'SS',
         * */
        const { data: loginStatus } = await axios.request({
          method: "get",
          url: "/radusuarios",
          data: {
            qtype: "radusuarios.id",
            query: "", //id do login,
            oper: "=",
            page: "1",
            rp: "200000",
            sortname: "radusuarios.id",
            sortorder: "desc"
          }
        })
        return msg.reply("Bloco de ver o status da internet");
      }

      userState.state = ChatState.TALK_TO_ATTENDANT_REQUESTED;
      if (body === "3") {
        return msg.reply("Bloco de falar com o atendente");
      }
      return msg.reply("É nois cara, vou te passar pro atendimento");
    }
    case ChatState.FINANCIAL_AWAITING_BILLET_CHOICE: {
      if (body === "1") {
        userState.state = ChatState.FINANCIAL_GET_BILLETS_REQUESTED;
        return await getBillets({ msg, userState });
      }
      //TODO: pegar o number do boleto selecionado para colocar nessa rota de puxar o arquivo 
      if (body === "2") {
        userState.state = ChatState.FINANCIAL_CONFIRM_PAYMENT_REQUESTED;
        return msg.reply("Lógica de confirmar pagamento");
      }
      userState.state = ChatState.TALK_TO_ATTENDANT_REQUESTED;
      return msg.reply("É nois cara, vou te passar pro atendimento");
    }
    case ChatState.FINANCIAL_CONFIRM_PAYMENT_REQUESTED: {
      //caso precise de mais opções nesses 2 cenários
    }

    case ChatState.FINANCIAL_GET_BILLETS_REQUESTED: {
      //caso precise de mais opções nesses 2 cenários
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
