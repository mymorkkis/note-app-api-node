import type { FastifyReply, FastifyRequest } from "fastify";
import {
  type DBRowCountType,
  type NoteInputType,
  type NoteType,
  type PaginationType,
} from "../types.js";

export const getNotes = async (
  request: FastifyRequest<{ Querystring: PaginationType }>,
  reply: FastifyReply
) => {
  const { limit, offset } = request.query;

  const { rows }: { rows: NoteType[] } = await request.server.pg.query(
    "SELECT id, title, body FROM notes WHERE user_id = $1 ORDER BY id LIMIT $2 OFFSET $3;",
    [request.user.id, limit, offset]
  );

  reply.status(200).send(rows);
};

export const getNote = async (
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const { rows }: { rows: NoteType[] } = await request.server.pg.query(
    "SELECT id, title, body FROM notes WHERE id = $1 AND user_id = $2;",
    [id, request.user.id]
  );

  if (rows.length === 0) {
    reply.status(404).send({ error: "Note not found" });
  }

  const note = rows[0];
  reply.status(200).send(note);
};

export const createNote = async (
  request: FastifyRequest<{ Body: NoteInputType }>,
  reply: FastifyReply
) => {
  const { title, body } = request.body;

  const { rows }: { rows: NoteType[] } = await request.server.pg.query(
    "INSERT INTO notes (title, body, user_id) VALUES ($1, $2, $3) RETURNING id, title, body;",
    [title, body, request.user.id]
  );

  const createdNote = rows[0];
  reply.status(201).send(createdNote);
};

export const updateNote = async (
  request: FastifyRequest<{ Params: { id: number }; Body: NoteInputType }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const { title, body } = request.body;

  const { rows }: { rows: NoteType[] } = await request.server.pg.query(
    "UPDATE notes SET title=$1, body=$2 WHERE id = $3 AND user_id = $4 RETURNING id, title, body;",
    [title, body, id, request.user.id]
  );

  if (rows.length === 0) {
    reply.status(404).send({ error: "Note not found" });
  }

  const updatedNote = rows[0];
  reply.status(200).send(updatedNote);
};

export const deleteNote = async (
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  const { rowCount }: DBRowCountType = await request.server.pg.query(
    "DELETE FROM notes WHERE id = $1 AND user_id = $2;",
    [id, request.user.id]
  );

  if (rowCount === 1) {
    reply.status(200).send({ message: "Note deleted successfully" });
  } else {
    reply.status(404).send({ error: "Note not found" });
  }
};
