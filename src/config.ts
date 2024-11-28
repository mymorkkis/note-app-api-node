import { cleanEnv, str, port, host, num } from "envalid";

const config = cleanEnv(process.env, {
  API_PORT: port(),
  API_HOST: host(),
  POSTGRES_DB: str(),
  POSTGRES_USER: str(),
  POSTGRES_PASSWORD: str(),
  POSTGRES_PORT: port(),
  MIGRATION_VERSION: str({ default: "max" }),
  NODE_ENV: str({ choices: ["development", "test", "production", "staging"] }),
  JWT_SECRET: str(),
});

export default config;
