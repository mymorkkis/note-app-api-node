import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import Postgrator from "postgrator";
import config from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrate = async () => {
  let result: Postgrator.Migration[] = [];

  try {
    const client = new pg.Client({
      host: config.API_HOST,
      port: config.POSTGRES_PORT,
      database: config.POSTGRES_DB,
      user: config.POSTGRES_USER,
      password: config.POSTGRES_PASSWORD,
    });

    await client.connect();

    const postgrator = new Postgrator({
      migrationPattern: path.join(__dirname, "/migrations/*"),
      driver: "pg",
      database: client.database,
      schemaTable: "migrations",
      currentSchema: "public",
      execQuery: (query) => client.query(query),
    });

    result = await postgrator.migrate(config.MIGRATION_VERSION);

    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  if (result.length === 0) {
    console.log(
      "No migrations run for schema 'public'. Already at the latest one or specified version."
    );
  } else {
    console.log("Migration done.");
  }

  process.exit(0);
};

await migrate();
