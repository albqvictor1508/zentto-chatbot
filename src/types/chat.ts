
export type ChatData = {
  step: number;
  data: {
    name?: string;
    cpf?: string;
    phone?: string;
    block?: Block;
    id?: string;
  };
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

export const status = {
  RECEIVED: "R",
  TO_RECEIVE: "A",
  PARCIAL: "P",
  CANCELLED: "C"
} as const;
/*
export type DefaultQuery = {
  page: string;
  total: string;
  registros: Array<{}>;
};
*/

export enum Block {
  ONE = "financial status",
  TWO = "internet status",
  THREE = "talk to attendat",
}
