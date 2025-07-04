import { Client } from "whatsapp-web.js";

export type UserData = {
  id?: string;
  name?: string;
  cpf?: string;
  phone?: string;
  block?: Block;
}

export enum ChatState {
  AWAITING_CPF,
  AWAITING_MAIN_MENU_CHOICE,         // Financeiro, Internet, etc
  FINANCIAL_AWAITING_SUBMENU_CHOICE, // 2ª via, confirmar pgto
  FINANCIAL_AWAITING_BILLET_CHOICE,  // Mostrou a lista de boletos e aguarda a escolha
  INTERNET_STATUS_REQUESTED,         // Usuário pediu status da internet
  TALK_TO_ATTENDANT_REQUESTED,     // Usuário pediu para falar com atendente
  FINANCIAL_CONFIRM_PAYMENT_REQUESTED,  // Mostrou a lista de boletos e aguarda a escolha
  FINANCIAL_GET_BILLETS_REQUESTED,
}

export type ChatData = {
  state: ChatState,
  data: UserData,
  currentStateData: {
    billets?: BilletSchema[]
    billetResponse?: string
  }
};

export type BilletSchema = {
  id: string,
  valor: number,
  status: string,
  dataVencimento: string
  dataEmissao: string,
  liberado: string
  number?: number
};

export type DefaultParams = {
  userState: ChatData;
  whatsappClient: Client;
  chatId: string
}

export const status = {
  RECEIVED: "R",
  TO_RECEIVE: "A",
  PARCIAL: "P",
  CANCELLED: "C"
} as const;

export enum Block {
  ONE = "financial status",
  TWO = "internet status",
  THREE = "talk to attendat",
}
