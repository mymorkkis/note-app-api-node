import type { FastifyReply, FastifyRequest } from "fastify";
import {
  type DBRowCountType,
  type NoteInputType,
  type NoteType,
} from "../types.js";

export const getNotes = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { rows }: { rows: NoteType[] } = await request.server.pg.query(
      "SELECT id, title, body FROM notes WHERE user_id = $1;",
      [request.user.id]
    );

    reply.status(200).send(rows);
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getNote = async (
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  try {
    const { rows }: { rows: NoteType[] } = await request.server.pg.query(
      "SELECT id, title, body FROM notes WHERE id = $1 AND user_id = $2;",
      [id, request.user.id]
    );

    if (rows.length === 0) {
      reply.status(404).send({ error: "Note not found" });
    }

    const note = rows[0];
    reply.status(200).send(note);
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const createNote = async (
  request: FastifyRequest<{ Body: NoteInputType }>,
  reply: FastifyReply
) => {
  const { title, body } = request.body;

  try {
    const { rows }: { rows: { id: number }[] } = await request.server.pg.query(
      "INSERT INTO notes (title, body, user_id) VALUES ($1, $2, $3) RETURNING id;",
      [title, body, request.user.id]
    );

    const id = rows[0].id;
    reply.status(201).send({ id, title, body });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const updateNote = async (
  request: FastifyRequest<{ Params: { id: number }; Body: NoteInputType }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const { title, body } = request.body;

  try {
    const { rowCount }: DBRowCountType = await request.server.pg.query(
      "UPDATE notes SET title=$1, body=$2 WHERE id = $3 AND user_id = $4;",
      [title, body, id, request.user.id]
    );

    if (rowCount === 1) {
      reply.status(200).send({ id, title, body });
    } else {
      reply.status(404).send({ error: "Note not found" });
    }
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const deleteNote = async (
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  try {
    const { rowCount }: DBRowCountType = await request.server.pg.query(
      "DELETE FROM notes WHERE id = $1 AND user_id = $2;",
      [id, request.user.id]
    );

    if (rowCount === 1) {
      reply.status(200).send({ message: "Note deleted successfully" });
    } else {
      reply.status(404).send({ error: "Note not found" });
    }
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};
