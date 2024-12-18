import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  ErrorResponse,
  Note,
  NoteInput,
  Pagination,
  SuccessfullResponse,
  type NoteInputType,
  type PaginationType,
} from "../types.js";
import {
  createNote,
  deleteNote,
  getNote,
  getNotes,
  updateNote,
} from "../handlers/notes.js";

const plugin: FastifyPluginAsyncTypebox = async (fastify, _opts) => {
  fastify.get<{ Querystring: PaginationType }>(
    "/notes",
    {
      schema: {
        querystring: Pagination,
        response: {
          200: {
            type: "array",
            items: Note,
          },
        },
      },
      onRequest: [fastify.authenticate],
    },
    getNotes
  );

  fastify.get<{ Params: { id: number } }>(
    "/notes/:id",
    {
      schema: {
        response: {
          200: Note,
          404: ErrorResponse,
          500: ErrorResponse,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getNote
  );

  fastify.post<{ Body: NoteInputType }>(
    "/notes",
    {
      schema: {
        body: NoteInput,
        response: {
          201: Note,
          500: ErrorResponse,
        },
      },
      onRequest: [fastify.authenticate],
    },
    createNote
  );

  fastify.put<{ Params: { id: number }; Body: NoteInputType }>(
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
      onRequest: [fastify.authenticate],
    },
    updateNote
  );

  fastify.delete<{ Params: { id: number } }>(
    "/notes/:id",
    {
      schema: {
        response: {
          200: SuccessfullResponse,
          500: ErrorResponse,
        },
      },
      onRequest: [fastify.authenticate],
    },
    deleteNote
  );
};

export default plugin;
