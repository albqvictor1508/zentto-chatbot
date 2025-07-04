import axios from "../db/axios.ts";
import { BilletSchema, ChatState, DefaultParams, status } from "../types/chat.ts";

const ACTUAL_DATE = new Date();
const THREE_MONTHS_LATER = new Date(ACTUAL_DATE);
THREE_MONTHS_LATER.setMonth(ACTUAL_DATE.getMonth() + 3);

export async function getBillets({ userState, msg }: DefaultParams) {
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

  function getBilletResponse({ billets, proporse }: { billets: BilletSchema[], proporse: string }): string {
    const billetList = billets
      .map((billet) => {
        const statusDescription = billet.status === status.TO_RECEIVE ? "A pagar" : null;

        const [year, month, day] = billet.dataVencimento.split('T')[0].split('-');
        const formattedDate = `${day}/${month}/${year}`;

        return `${billet.number}. *Valor: R$ ${billet.valor}* | Vencimento: ${formattedDate} | Status: ${statusDescription ?? "Erro"}`;
      })
      .join("\n");

    //posso usar essa mesma response pra segunda via e pagamento pra manter o padrão
    return `Você possui ${actualBillets.length} boletos. Escolha o número do boleto para ${proporse}:\n\n${billetList}`;
  }
  userState.state = ChatState.FINANCIAL_GET_BILLETS_REQUESTED;
  userState.currentStateData.billets = actualBillets;
  userState.currentStateData.billetResponse = getBilletResponse;
  return msg.reply(getBilletResponse({ billets: actualBillets, proporse: "realizar o pagamento" }));
}


