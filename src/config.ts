import { cleanEnv, str, port, host, num } from "envalid";

const config = cleanEnv(process.env, {
  API_PORT: port(),
  API_HOST: host(),
  JWT_SECRET: str(),
  COOKIE_SECRET: str(),
  POSTGRES_DB: str(),
  POSTGRES_USER: str(),
  POSTGRES_PASSWORD: str(),
  POSTGRES_PORT: port(),
  MIGRATION_VERSION: str({ default: "max" }),
  SALT_ROUNDS: num({ default: 10 }),
  NODE_ENV: str({
    default: "production",
    choices: ["development", "test", "production", "staging"],
  }),
});

export default config;
