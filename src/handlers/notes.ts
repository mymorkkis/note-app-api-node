import type { FastifyReply, FastifyRequest } from "fastify";
import { type NoteType } from "../types.js";

export const getNotes = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { rows }: { rows: NoteType[] } = await request.server.pg.query(
      "SELECT id, title, body FROM notes WHERE user_id = $1",
      [request.userId]
    );
    reply.status(200).send(rows);
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const createNote = async (
  request: FastifyRequest<{ Body: NoteType }>,
  reply: FastifyReply
) => {
  const { title, body } = request.body;

  try {
    const { rows }: { rows: { id: number }[] } = await request.server.pg.query(
      "INSERT INTO notes (title, body, user_id) VALUES ($1, $2, $3) RETURNING id",
      [title, body, request.userId]
    );
    const id = rows[0].id;
    reply.status(201).send({ id, title, body });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};
