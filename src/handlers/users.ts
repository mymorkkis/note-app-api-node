import bcrypt from "bcrypt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { type UserType } from "../types.js";

export const registerUser = async (
  request: FastifyRequest<{ Body: UserType }>,
  reply: FastifyReply
) => {
  const { email, password } = request.body;
  // TODO Handle user already registered

  try {
    const saltRounds = 10; // TODO Add mechanism to adjust this value
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const { rows }: { rows: { id: number }[] } = await request.server.pg.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id;",
      [email, hashedPassword]
    );
    request.log.info(`Created user for ${email}, id=${rows[0].id}`);
    reply.status(201).send({ message: "User registered successfully" });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const loginUser = async (
  request: FastifyRequest<{ Body: UserType }>,
  reply: FastifyReply
) => {
  const { email, password } = request.body;
  let userId;
  // TODO implement account lockout if too many failed login attempts

  try {
    const { rows } = await request.server.pg.query(
      "SELECT id, password FROM users WHERE email = $1;",
      [email]
    );

    if (rows.length === 1) {
      if (await bcrypt.compare(password, rows[0].password)) {
        userId = rows[0].id;
      }
    }
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }

  if (!userId) {
    reply.status(404).send({ error: "Invalid email/password combination" });
  }

  const token = request.server.jwt.sign({ sub: userId });
  reply.status(200).send({ token });
};
