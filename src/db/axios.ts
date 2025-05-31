import axios from "axios";
import https from "node:https";
import { env } from "../common/env";
import chalk from "chalk";

const httpsAgent = new https.Agent({
	rejectUnauthorized: false,
});

console.log(chalk.bgCyanBright(env.IXC_TOKEN));

const instance = axios.create({
	baseURL: env.IXC_HOST,
	httpsAgent,
	timeout: 2000,
	headers: {
		Authorization: `Basic ${env.IXC_TOKEN}`,
	},
});

export default instance;
