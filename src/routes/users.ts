import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  ErrorResponse,
  SuccessfullResponse,
  TokenCreatedResponse,
  User,
} from "../types.js";
import { loginUser, registerUser } from "../handlers/users.js";

const plugin: FastifyPluginAsyncTypebox = async (fastify, _opts) => {
  fastify.post(
    "/register",
    {
      schema: {
        body: User,
        response: {
          201: SuccessfullResponse,
          500: ErrorResponse,
        },
      },
    },
    registerUser
  );

  fastify.post(
    "/login",
    {
      schema: {
        body: User,
        response: {
          200: TokenCreatedResponse,
          404: ErrorResponse,
          500: ErrorResponse,
        },
      },
    },
    loginUser
  );
};

export default plugin;
