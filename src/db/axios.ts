import axios from "axios";
import https from "node:https";
import { env } from "../common/env";
import chalk from "chalk";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const IXC_TOKEN = Buffer.from(`${env.IXC_USER}:${env.IXC_PASSWORD}`).toString(
  "base64",
);

const instance = axios.create({
  baseURL: env.IXC_HOST,
  httpsAgent,
  timeout: 10000,
  headers: {
    ixcsoft: "listar",
    Authorization: `Basic ${IXC_TOKEN}`,
    "Content-Type": "application/json",
    Cookie: 'IXC_Session = nuf31qft9acm787sj8alovhhen',
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
