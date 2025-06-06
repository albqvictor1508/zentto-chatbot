import { cleanEnv, num, str, url } from "envalid";

export const env = cleanEnv(process.env, {
	PORT: num(),
	DB_URL: url(),
	IXC_HOST: url(),
	IXC_USER: str(),
	IXC_PASSWORD: str(),
});
