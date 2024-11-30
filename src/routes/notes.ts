import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  ErrorResponse,
  Note,
  NoteInput,
  SuccessfullResponse,
} from "../types.js";
import {
  createNote,
  deleteNote,
  getNote,
  getNotes,
  updateNote,
} from "../handlers/notes.js";

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

  fastify.get(
    "/notes/:id",
    {
      schema: {
        response: {
          200: Note,
          404: ErrorResponse,
          500: ErrorResponse,
        },
      },
    },
    getNote
  );

  fastify.post(
    "/notes",
    {
      schema: {
        body: NoteInput,
        response: {
          201: Note,
          500: ErrorResponse,
        },
      },
    },
    createNote
  );

  fastify.put(
    "/notes/:id",
    {
      schema: {
        body: NoteInput,
        response: {
          200: Note,
          404: ErrorResponse,
          500: ErrorResponse,
        },
      },
    },
    updateNote
  );

  fastify.delete(
    "/notes/:id",
    {
      schema: {
        response: {
          200: SuccessfullResponse,
          500: ErrorResponse,
        },
      },
    },
    deleteNote
  );
};

export default plugin;
