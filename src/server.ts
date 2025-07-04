import { fastify } from "fastify";
import { Client, LocalAuth, Message, MessageMedia } from "whatsapp-web.js";
import chalk from "chalk";
import axios from "./db/axios";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import qrcode from "qrcode-terminal";
import { ChatState, type ChatData } from "./types/chat";
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
  try {
    // TODO: Adicionar o ID do grupo de atendimento
    const ATTENDANT_GROUP_CHAT_ID = "";
    const chatId = msg.from;
    const body = msg.body.trim();

    if (chatId !== "120363420137790776@g.us") return; // WARN: APAGAR ISSO DEPOIS

    if (body === "!care") {
      const context: ChatData = {
        state: ChatState.AWAITING_CPF,
        data: {},
        currentStateData: {},
      };
      userStates.set(chatId, context);
      return whatsappClient.sendMessage(
        chatId,
        `${sayGrace(
          new Date(),
        )} 👋, Sou o *Zentto*, seu assistente virtual! Vamos resolver o que você precisa rapidinho. Como posso ajudar?\n\nAntes de começarmos, digite o CPF no qual está ligada ao plano de internet, e se ainda não é um cliente, digite 1\n\t\t`,
      );
    }

    const userState = userStates.get(chatId);
    if (!userState) return;

    switch (userState.state) {
      case ChatState.AWAITING_CPF: {
        try {
          if (body === "1") {
            userState.state = ChatState.AWAITING_MAIN_MENU_CHOICE;
            return whatsappClient.sendMessage(
              chatId,
              "Quer fazer plano com nois paizão, R$ 89,90 por 2KB de internet!",
            );
          }
          const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

          if (!cpfRegex.test(body)) {
            return whatsappClient.sendMessage(
              chatId,
              "CPF inválido, tente novamente ou digite *1* para realizar um novo cadastro!",
            );
          }
          const cpfValidated = formatCpf(body);
          const { data } = await axios.request({
            method: "get",
            url: "/cliente",
            data: {
              qtype: "cnpj_cpf",
              query: cpfValidated,
              oper: "=",
              page: "1",
              rp: "1",
              sortname: "cliente.id",
              sortorder: "desc",
            },
          });

          if (!data.registros) {
            return whatsappClient.sendMessage(
              chatId,
              "Não existe nenhum cliente cadastrado com esse CPF, Envie um CPF novamente ou digite 1 para realizar cadastro",
            );
          }
          userState.data.cpf = cpfValidated;
          userState.data.name = data.registros[0].fantasia;
          userState.data.id = data.registros[0].id;
          userState.data.phone = msg.from.split("@")[0];
          userState.state = ChatState.AWAITING_MAIN_MENU_CHOICE;
          return whatsappClient.sendMessage(
            chatId,
            `
Olá ${userState.data.name}, Como posso ajudar ?

1 - Analisar status financeiro.
2 - Status da minha internet.
3 - Falar com atendente.

Digite o número da opção desejada.
`,
          );
        } catch (error) {
          console.error(error);
          return whatsappClient.sendMessage(chatId, "Erro no bot");
        }
      }
      case ChatState.FINANCIAL_AWAITING_SUBMENU_CHOICE: {
        if (body === "1") {
          userState.state = ChatState.FINANCIAL_AWAITING_SUBMENU_CHOICE;
          return whatsappClient.sendMessage(
            chatId,
            `
BLOCO DE ANALISAR STATUS FINANCEIRO!

1 - Segunda via do boleto.
2 - Confirmar pagamento.
					`,
          );
        }
        if (body === "2") {
          userState.state = ChatState.INTERNET_STATUS_REQUESTED;
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
              sortorder: "desc",
            },
          });

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
              sortorder: "desc",
            },
          });
          return whatsappClient.sendMessage(chatId, "Bloco de ver o status da internet");
        }

        userState.state = ChatState.TALK_TO_ATTENDANT_REQUESTED;
        if (body === "3") {
          return whatsappClient.sendMessage(chatId, "Bloco de falar com o atendente");
        }
        return whatsappClient.sendMessage(chatId, "É nois cara, vou te passar pro atendimento");
      }
      case ChatState.FINANCIAL_AWAITING_BILLET_CHOICE: {
        if (body === "1") {
          userState.state = ChatState.FINANCIAL_GET_BILLETS_REQUESTED;
          return await getBillets({ userState, chatId, whatsappClient });
        }
        if (body === "2") {
          userState.state = ChatState.FINANCIAL_CONFIRM_PAYMENT_REQUESTED;
          return whatsappClient.sendMessage(chatId, "Lógica de confirmar pagamento");
        }

        userState.state = ChatState.TALK_TO_ATTENDANT_REQUESTED;
        return whatsappClient.sendMessage(chatId, "É nois cara, vou te passar pro atendimento");
      }
      case ChatState.FINANCIAL_GET_BILLETS_REQUESTED: {
        const num = Number(body);
        const billets = userState.currentStateData.billets;
        if (!billets) throw new Error("Actual billets is empty in FINANCIAL_GET_BILLETS_REQUESTED");
        const billet = billets.find((billet) => billet.number === num);
        if (!billet) {
          return whatsappClient.sendMessage(chatId, "Número do boleto inválido. Tente novamente.");
        }

        const { data: getBilletArchive } = await axios.request({
          method: "get",
          url: "/get_boleto",
          data: {
            boletos: billet.id,
            juro: "N",
            multa: "N",
            atualiza_boleto: "arquivo",
            base64: "S",
          },
        });
        console.log(getBilletArchive.base64);

        const media = new MessageMedia(
          "application/pdf",
          getBilletArchive.base64,
          `boleto-${billet.id}.pdf`,
        );

        return whatsappClient.sendMessage(chatId, media);
      }
      case ChatState.TALK_TO_ATTENDANT_REQUESTED: {
        if (!ATTENDANT_GROUP_CHAT_ID) {
          console.error("ATTENDANT_GROUP_CHAT_ID não está configurado.");
          return whatsappClient.sendMessage(chatId, "Não foi possível contatar um atendente. Tente novamente mais tarde.");
        }
        return whatsappClient.sendMessage(
          ATTENDANT_GROUP_CHAT_ID,
          `O cliente ${userState.data.name}, Telefone: ${userState.data.phone} precisa da sua ajuda!`,
        );
      }
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
});

whatsappClient.on("disconnected", (reason) => {
  console.log(chalk.yellow("WhatsApp Client disconnected:"), reason);
});

whatsappClient.on("auth_failure", (message) => {
  console.error(chalk.red("Authentication failed:"), message);
});

whatsappClient.initialize();
