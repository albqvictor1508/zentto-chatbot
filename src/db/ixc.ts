import { IXCClient } from "ixc-orm";
import { env } from "../common/env";

class Contract extends IXCClient {
	constructor() {
		//preciso saber o nome da tabela, na documentação sempre tem dizendo lá
		super("cliente_contrato");
	}
}

export const ixcClient = {
	contract: new Contract(),
	authToken: `Basic ${Buffer.from(env.IXC_HOST).toString("base64")}`,
};
