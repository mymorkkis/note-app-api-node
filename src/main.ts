import config from "./config.js";
import buildServer from "./server.js";

const main = async () => {
  try {
    const server = await buildServer();
    await server.listen({ port: config.API_PORT, host: config.API_HOST });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
