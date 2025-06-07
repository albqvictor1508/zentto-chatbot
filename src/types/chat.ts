export type ChatData = {
	step: number;
	data: { name?: string; cpf?: string; phone?: string; block?: Block };
};

export enum Block {
	ONE = "financial status",
	TWO = "internet status",
	THREE = "talk to attendat",
}
