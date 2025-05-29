import { IXCClient } from "ixc-orm";

class Contract extends IXCClient {
	constructor() {
		//preciso saber o nome da tabela, na documentação sempre tem dizendo lá
		super("cliente_contrato");
	}
}

export const ixcClient = { contract: new Contract() };
