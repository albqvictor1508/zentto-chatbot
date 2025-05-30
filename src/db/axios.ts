import axios from "axios";
import https from "node:https";
import { env } from "../common/env";
import chalk from "chalk";

const httpsAgent = new https.Agent({
	rejectUnauthorized: false,
});

const authToken = Buffer.from(env.IXC_TOKEN).toString("base64");
console.log(chalk.bgCyanBright(authToken));

const instance = axios.create({
	baseURL: env.IXC_HOST,
	httpsAgent,
	timeout: 2000,
	headers: {
		Authorization: `Basic ${authToken}`,
	},
});

export default instance;
