import fastifyPostgres from "@fastify/postgres";
import autoload from "@fastify/autoload";
import fastifyJwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import config from "./config.js";
import { fileURLToPath } from "url";
import path from "node:path";
import fastifyCookie from "@fastify/cookie";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: number;
    };
  }
}

const envToLogger = {
  development: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
  staging: true,
  production: true,
  test: false,
};

const buildServer = async () => {
  const fastify: FastifyInstance = Fastify({
    logger: envToLogger[config.NODE_ENV],
  });

  fastify.register(fastifyPostgres, {
    host: config.API_HOST,
    port: config.POSTGRES_PORT,
    database: config.POSTGRES_DB,
    user: config.POSTGRES_USER,
    password: config.POSTGRES_PASSWORD,
  });
  fastify.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    cookie: {
      cookieName: "refreshToken",
      signed: true,
    },
  });
  fastify.register(fastifyCookie, {
    secret: config.COOKIE_SECRET,
  });
  fastify.register(swagger);
  fastify.register(swaggerUI, {
    routePrefix: "/docs",
  });
  fastify.register(autoload, {
    dir: path.join(__dirname, "routes"),
  });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (error) {
        request.log.error(error);
        reply.status(401).send({ error: "Unauthorized" });
      }
    }
  );

  return fastify;
};

export default buildServer;
