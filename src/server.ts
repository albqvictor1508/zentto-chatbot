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
import { BilletSchema, Block, status, type ChatData } from "./types/chat";

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
whatsappClient.on("message", async (msg) => {
  const chatId = msg.from;
  const body = msg.body.trim();

  if (chatId !== "120363420137790776@g.us") return; // WARN: APAGAR ISSO DEPOIS

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
      try {
        if (body === "1") {
          userState.step++;
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
            rp: 5, //WARN: DIMINUIR ISSO OU REFATORAR LÁ EMBAIXO PRA N USAR "registros[0]"
            sortname: "cliente.id",
            sortorder: "desc",
          },
        });
        console.log(data.registros ? data.registros.length : "não tem");
        console.log("CPF VALIDATED: %s", cpfValidated);

        if (!data.registros)
          return msg.reply(
            "Não existe nenhum cliente cadastrado com esse CPF, Envie um CPF novamente ou digite 1 para realizar cadastro",
          );
        userState.data.cpf = cpfValidated;
        userState.data.name = data.registros[0].fantasia;
        userState.data.id = data.registros[0].id;
        userState.step++;
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
          const { data: getBilletList } = await axios.request({
            method: "GET",
            url: "/fn_areceber",
            data: {
              qtype: "fn_areceber.id_cliente",
              query: userState.data.id,
              oper: "=",
              page: "1",
              rp: "200000",
              sortname: "fn_areceber.data_vencimento",
              sortorder: "asc"
            }
          });
          const actualBillets: BilletSchema[] = getBilletList.registros.filter((billet: { status: string, data_final: string, data_emissao: string, data_vencimento: string }) => {
            const billetDate = new Date(billet.data_vencimento);
            return billetDate >= ACTUAL_DATE && billetDate < THREE_MONTHS_LATER && billet.status === status.TO_RECEIVE;
          }).map(billet => {
            return {
              id: billet.id,
              valor: billet.valor,
              status: billet.status,
              dataVencimento: billet.data_vencimento,
              dataEmissao: billet.data_emissao,
              liberado: billet.liberado
            };
          });

          //TODO: BOLAR UM WORKFLOW CASO NÃO TENHA NENHUM BOLETO ATUAL

          if (actualBillets.length === 0) return msg.reply("Você não possui boletos a receber, deseja falar com o suporte?");


          //TODO: VALIDAR SE FOI PAGO

          if (actualBillets.length === 1) {
            const billetId = actualBillets[0].id;
            const { data: getBilletArchive } = await axios.request({
              method: "get",
              url: "/get_boleto",
              data: {
                boletos: billetId,
                juro: "N",
                multa: "N",
                atualiza_boleto: "arquivo",
                base64: "S",
              },
            });

            console.log(getBilletArchive);
            return msg.reply("lógica se houver apenas 1 boleto atual");
          }
          for (let i = 0; i < actualBillets.length; i++) {
            actualBillets[i].number = i + 1;
          }

          const billetList = actualBillets
            .map((billet) => {
              const statusDescription = billet.status === status.TO_RECEIVE ? "A pagar" : null;

              const [year, month, day] = billet.dataVencimento.split('T')[0].split('-');
              const formattedDate = `${day}/${month}/${year}`;

              return `${billet.number}. *Valor: R$ ${billet.valor}* | Vencimento: ${formattedDate} | Status: ${statusDescription ?? "Erro"}`;
            })
            .join("\n");

          const replyMessage = `Você possui ${actualBillets.length} boletos. Escolha o número do boleto para receber a 2ª via:\n\n${billetList}`;

          return msg.reply(replyMessage);
        }
        //TODO: pegar o number do boleto selecionado para colocar nessa rota de puxar o arquivo 
        if (body === "2") {
          return msg.reply("Lógica de confirmar pagamento");
        }
        userState.data.block = Block.THREE;
        userState.step++;
        return msg.reply("É nois cara, vou te passar pro atendimento");
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
