import { MongoClient } from "mongodb";
import { env } from "../common/env";
import chalk from "chalk";

const client = new MongoClient(env.DB_URL);

const connect = async () => {
  try {
    await client.connect();
    console.error(chalk.greenBright("DB SUCCESSFULLY CONNECTED!"));
    return client.db("zentto-chatbot");
  } catch (error) {
    console.error(chalk.red("ERROR TO CONNECT IN DB"));
    throw error;
  }
};

//WARN: SUBIR ESSE BANCO PRA SALVAR INFORMAÇÃO NELE VIA JSON, ESSE PROJETO N É DEPENDENTE DE RELACIONAMENTO ENTRE TABELAS,
//SÓ SALVAR UNS JSONB GRANDE
export const db = await connect();
