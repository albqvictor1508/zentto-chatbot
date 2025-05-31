import axios from "axios";
import https from "node:https";
import { env } from "../common/env";
import chalk from "chalk";

const httpsAgent = new https.Agent({
	rejectUnauthorized: false,
});

console.log(chalk.bgCyanBright(env.IXC_TOKEN));

const instance = axios.create({
	httpsAgent,
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
		Authorization: `Basic ${env.IXC_TOKEN}`,
	},
});

instance.interceptors.request.use((request) => {
	console.log(
		chalk.blue(`IXC REQUEST: ${request.method?.toUpperCase()} ${request.url}`),
	);
	return request;
});

instance.interceptors.response.use(
	(response) => {
		console.log(
			chalk.blue(
				`IXC RESPONSE: ${response.status}, ${response.statusText} ${JSON.stringify(response.data)}`,
			),
		);
		return response;
	},
	(error) => {
		console.log(
			chalk.red(
				`IXC REQUEST ERROR: ${error.response?.status} ${error.response?.data}, `,
			),
		);
	},
);

export default instance;
