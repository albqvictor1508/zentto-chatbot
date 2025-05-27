import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export const CreateCostumerRoute: FastifyPluginAsyncZod = async (app) => {
	app.post(
		"/api/costumer",
		{
			schema: {
				body: z.object({}),
			},
		},
		async (request, reply) => {
			//validar o body e enviar pra API do IXC
		},
	);
};
