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

const ATTENDANT_GROUP_CHAT_ID = "120363421978310576@g.us";
const TEST_GROUP_ID = "120363420137790776@g.us";

const ACTUAL_DATE = new Date();
const THREE_DAYS_LATER = new Date(ACTUAL_DATE);
THREE_DAYS_LATER.setDate(ACTUAL_DATE.getDay() + 3);

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

//WARN: ADICIONAR O ASSUNTO PRA FACILITAR O SUPORTE, DA PRA CRIAR UM OBJETO BASEADO NO STATE
async function handleTalkToAttendant(chatId: string, userState: ChatData) {
  try {
    if (!ATTENDANT_GROUP_CHAT_ID) {
      console.error("[ATTENDANT] ATTENDANT_GROUP_CHAT_ID is not configured.");
      await whatsappClient.sendMessage(chatId, "Não foi possível contatar um atendente. Tente novamente mais tarde.");
      return;
    }
    await whatsappClient.sendMessage(
      ATTENDANT_GROUP_CHAT_ID,
      `O cliente ${userState.data.name}, Telefone: ${userState.data.phone} precisa da sua ajuda!`,
    );
    await whatsappClient.sendMessage(chatId, "Sua solicitação foi enviada para um de nossos atendentes. Em breve, um deles entrará em contato com você.");
    userStates.delete(chatId);
  } catch (error) {
    console.error(`[ATTENDANT] Error handling request for ${chatId}:`, error);
    await whatsappClient.sendMessage(chatId, "Ocorreu um erro ao solicitar o atendimento. Tente novamente mais tarde.");
  }
}

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

whatsappClient.on("message", async (msg: Message) => {
  const chatId = msg.from;
  const body = msg.body.trim();

  try {
    if (body === "!care" && chatId === TEST_GROUP_ID) {
      const context: ChatData = {
        state: ChatState.AWAITING_CPF,
        data: {},
        currentStateData: {},
      };
      userStates.set(chatId, context);
      await whatsappClient.sendMessage(
        chatId,
        `${sayGrace(
          new Date(),
        )} 👋, Sou o *Zentto*, seu assistente virtual! Vamos resolver o que você precisa rapidinho. Como posso ajudar?\n\nAntes de começarmos, digite o CPF no qual está ligada ao plano de internet, e se ainda não é um cliente, digite 1\n\t\t`,
      );
      return;
    }

    const userState = userStates.get(chatId);
    if (!userState) return;

    switch (userState.state) {
      case ChatState.AWAITING_CPF: {
        if (body === "1") {
          userState.state = ChatState.AWAITING_MAIN_MENU_CHOICE;
          await whatsappClient.sendMessage(
            chatId,
            "Quer fazer plano com nois paizão, R$ 89,90 por 2KB de internet!",
          );
          return;
        }
        const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

        if (!cpfRegex.test(body)) {
          await whatsappClient.sendMessage(
            chatId,
            "CPF inválido, tente novamente ou digite *1* para realizar um novo cadastro!",
          );
          return;
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
          await whatsappClient.sendMessage(
            chatId,
            "Não existe nenhum cliente cadastrado com esse CPF, Envie um CPF novamente ou digite 1 para realizar cadastro",
          );
          return;
        }
        userState.data.cpf = cpfValidated;
        userState.data.name = data.registros[0].fantasia;
        userState.data.id = data.registros[0].id;
        //WARN: ISSO AQUI TA ERRADO, RESOLVER!!
        userState.data.phone = msg.from.split("@")[0];
        userState.state = ChatState.AWAITING_MAIN_MENU_CHOICE;
        await whatsappClient.sendMessage(
          chatId,
          `
Olá ${userState.data.name}, Como posso ajudar ?

1 - Analisar status financeiro.
2 - Status da minha internet.
3 - Falar com atendente.

Digite o número da opção desejada.
`,
        );
        return;
      }
      case ChatState.AWAITING_MAIN_MENU_CHOICE: {
        if (body === "1") {
          userState.state = ChatState.FINANCIAL_AWAITING_SUBMENU_CHOICE;
          await whatsappClient.sendMessage(
            chatId,
            `
BLOCO DE ANALISAR STATUS FINANCEIRO!

1 - Segunda via do boleto.
2 - Confirmar pagamento.
3 - Falar com atendente.
					`,
          );
          return;
        }
        if (body === "2") {
          userState.state = ChatState.INTERNET_STATUS_REQUESTED;

          const { data: loginData } = await axios.request({
            method: "get",
            url: "/radusuarios",
            data: {
              qtype: "radusuarios.id_cliente",
              query: userState.data.id,
              oper: "=",
              page: "1",
              rp: "1",
              sortname: "radusuarios.id",
              sortorder: "desc"
            }
          })

          const { ativo, online } = loginData;

          if (ativo === "S" && online === "N") {
            return await whatsappClient.sendMessage(chatId, "Notei aqui que sua conta está ativa, mas seu roteador não está conectado à nossa central no momento. Vamos fazer algumas verificações rápidas que costumam resolver isso:\n\n1️⃣ **Confira se o seu roteador (o aparelho da internet) está ligado na tomada** e com as luzes acesas.\n\n2️⃣ **Verifique se o cabo da fibra óptica (aquele fio mais fino e sensível) está bem encaixado** tanto no roteador quanto na caixinha na parede, sem nenhuma dobra forte ou dano aparente.\n\n3️⃣ Se estiver tudo certo, **retire o roteador da tomada, aguarde 30 segundos e ligue novamente.**\n\nSe após esses passos a conexão não voltar, pode ser um problema em nossa rede externa. Me avise para que eu possa abrir um chamado para nossa equipe técnica.");
          }

          if (ativo === "N" && online === "N") {
            await whatsappClient.sendMessage(chatId, "Verifiquei em nosso sistema e identifiquei que seu acesso à internet está bloqueado. Isso geralmente ocorre por alguma pendência financeira.\n\nPara regularizar a situação e reativar sua conexão, entrarei em contato com um de nossos atendentes.");
            await handleTalkToAttendant(chatId, userState);
            return;
          }

          return await whatsappClient.sendMessage(chatId, "Verifiquei aqui e sua conexão com a nossa central está ativa e funcionando normalmente. Isso significa que o sinal da internet está chegando corretamente até o seu roteador.\n\nNa maioria das vezes, o problema pode ser resolvido reiniciando o aparelho que você usa para navegar (celular ou computador) e também o seu roteador. Por favor, *retire o roteador da tomada, aguarde 30 segundos e ligue-o novamente.*\n\nSe mesmo assim não funcionar, digite 3 para entrar em contato com atendente");
        }
        if (body === "3") {
          await handleTalkToAttendant(chatId, userState);
          return;
        }
        return;
      }
      case ChatState.FINANCIAL_AWAITING_SUBMENU_CHOICE: {
        if (body === "1") {
          userState.state = ChatState.FINANCIAL_GET_BILLETS_REQUESTED;
          await getBillets({ userState, chatId, whatsappClient });
          return;
        }
        if (body === "2") {
          userState.state = ChatState.FINANCIAL_CONFIRM_PAYMENT_REQUESTED;
          await whatsappClient.sendMessage(chatId, "Lógica de confirmar pagamento");
          return;
        }
        if (body === "3") {
          await handleTalkToAttendant(chatId, userState);
          return;
        }
        return;
      }
      case ChatState.INTERNET_STATUS_REQUESTED: {
        if (body === "3") {
          await whatsappClient.sendMessage(chatId, "Estou entrando em contato contato com uns dos nossos atendentes.");
          return await handleTalkToAttendant(chatId, userState);
        }
        return;
      }

      case ChatState.FINANCIAL_TRUST_UNLOCKING_REQUESTED: {
        if (body !== "confiança") return;

        const { data: loginData } = await axios.request({
          method: "get",
          url: "/radusuarios",
          data: {
            qtype: "radusuarios.id_cliente",
            query: userState.data.id,
            oper: "=",
            page: "1",
            rp: "1",
            sortname: "radusuarios.id",
            sortorder: "desc"
          }
        })

        const { ativo, id_contrato } = loginData.registros[0];

        if (ativo === "S") return await whatsappClient.sendMessage(chatId, "Você não pode recorrer ao Desbloqueio de confiança se seu contrato estiver ativo!");

        const { data: trustUnlocking } = await axios.request({
          method: "get",
          url: "desbloqueio_confianca",
          data: {
            id: id_contrato
          }
        })

        console.log(trustUnlocking); //WARN: TESTAR ISSO COM UM USUÁRIO COM O CONTRATO DESATIVO
        return;
      }

      case ChatState.FINANCIAL_GET_BILLETS_REQUESTED: {
        console.log("entrei aq por algum motivo");
        //WARN: validar outro tipo de entrada

        userState.state = ChatState.FINANCIAL_TRUST_UNLOCKING_REQUESTED;
        const num = Number(body);
        const billets = userState.currentStateData.billets;
        if (!billets) throw new Error("Actual billets is empty in FINANCIAL_GET_BILLETS_REQUESTED");
        const billet = billets.find((billet) => billet.number === num);
        if (!billet) {
          await whatsappClient.sendMessage(chatId, "Número do boleto inválido. Tente novamente.");
          return;
        }

        /*
        const { data: getBilletData } = await axios.request({
          method: "get",
          url: "/get_boleto",
          data: {
            boletos: billet.id,
            juro: "N",
            multa: "N",
            atualiza_boleto: "N",
            tipo_boleto: "dados",
          },
        });
      */
        const { data: getBilletArchive } = await axios.request({
          method: "get",
          url: "/get_boleto",
          data: {
            boletos: billet.id,
            juro: "N",
            multa: "N",
            atualiza_boleto: "N",
            tipo_boleto: "arquivo",
            base64: "S",
          },
        });

        const base64Data = getBilletArchive.split('base64,')[1] || getBilletArchive;
        const media = new MessageMedia("application/pdf", base64Data, `boleto-${billet.id}.pdf`);

        await whatsappClient.sendMessage(chatId, media);
        //WARN: isso aqui pode ser melhorado!
        await whatsappClient.sendMessage(chatId, "Aqui está o boleto, você consegue realizar o pagamento lendo o código de barras diretamente do aplicativo do seu banco! Digite \"confiança\" para garantir o bloqueio de confiança.");

        //WARN: IMPLEMENTAR DESBLOQUEIO DE 72H, PRA "FINGIR" QUE O PAGAMENTO CAIU ATÉ QUE ELE REALMENTE CAIA 
        // SE NÃO CAIR, BLOQUEIA DNV, SE CAIR DEIXA DESBLOQUEADO 
        // SÓ PODE USAR 1 NO MÊS
        return;
      }
    }
  } catch (error) {
    console.error(error);
    const userState = userStates.get(chatId);

    if (!userState) {
      throw error;
    }

    await whatsappClient.sendMessage(chatId, "Erro no bot, você será direcionado ao atendimento!");
    //await handleTalkToAttendant(chatId, userState);
  }
});

whatsappClient.on("disconnected", (reason) => {
  console.log(chalk.yellow("WhatsApp Client disconnected:"), reason);
});

whatsappClient.on("auth_failure", (message) => {
  console.error(chalk.red("Authentication failed:"), message);
});

whatsappClient.initialize();
