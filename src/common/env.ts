import { cleanEnv, num, url } from "envalid";

export const env = cleanEnv(process.env, {
	PORT: num(),
	DB_URL: url(),
});
