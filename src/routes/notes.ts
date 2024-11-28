import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { ErrorResponse, Note } from "../types.js";
import { createNote, getNotes } from "../handlers/notes.js";

const plugin: FastifyPluginAsyncTypebox = async (fastify, _opts) => {
  fastify.get(
    "/notes",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: Note,
          },
        },
      },
    },
    getNotes
  );

  fastify.post(
    "/notes",
    {
      schema: {
        body: Note,
        response: {
          201: Note,
          500: ErrorResponse,
        },
      },
    },
    createNote
  );
};

export default plugin;
