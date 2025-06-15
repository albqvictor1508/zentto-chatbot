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

export type DefaultQuery = {
	page: string;
	total: string;
	registros: Array<{}>;
};

export enum Block {
	ONE = "financial status",
	TWO = "internet status",
	THREE = "talk to attendat",
}
