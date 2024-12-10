import bcrypt from "bcrypt";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  type DBRowCountType,
  type RefreshTokenType,
  type UserType,
} from "../types.js";
import { nowInSeconds } from "../utils.js";
import config from "../config.js";

export const registerUser = async (
  request: FastifyRequest<{ Body: UserType }>,
  reply: FastifyReply
) => {
  const { email, password } = request.body;

  try {
    const { rowCount }: DBRowCountType = await request.server.pg.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (rowCount !== 0) {
      reply.status(409).send({ error: "Already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, config.SALT_ROUNDS);
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

// TODO implement logout
export const loginUser = async (
  request: FastifyRequest<{ Body: UserType }>,
  reply: FastifyReply
) => {
  const { email, password } = request.body;
  // TODO implement account lockout if too many failed login attempts

  try {
    const { rows } = await request.server.pg.query(
      "SELECT id, password FROM users WHERE email = $1;",
      [email]
    );

    if (
      rows.length !== 1 ||
      !(await bcrypt.compare(password, rows[0].password))
    ) {
      return reply.status(404).send({ error: "Invalid email or password" });
    }

    const userId = rows[0].id;
    await createAndSendNewUserTokens(request, reply, userId);
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const refreshToken = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { refreshToken } = request.cookies;
    if (!refreshToken) {
      return reply.status(401).send({ error: "No refresh token in cookies" });
    }

    const { id: userId, exp: tokenExpiry } = request.server.jwt.decode(
      refreshToken
    ) as { id: number; exp: number };

    const { rows }: { rows: RefreshTokenType[] } =
      await request.server.pg.query(
        "SELECT id, token FROM refresh_tokens WHERE user_id = $1 AND expires_at = $2;",
        [userId, tokenExpiry]
      );

    const validToken =
      rows.length === 1 && (await bcrypt.compare(refreshToken, rows[0].token));

    if (!validToken) {
      // Compromised session, user will need to log in again on any device
      return await deleteAllRefreshTokensForUser(request, reply, userId);
    }

    await request.server.pg.query(
      "DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at = $2",
      [userId, tokenExpiry]
    );

    if (nowInSeconds() >= tokenExpiry) {
      request.log.info(`deleted expired refresh token for user ${userId}`);

      return reply
        .status(401)
        .send({ error: "Token expired, please log in again" });
    }

    request.log.info(`rotating tokens for user ${userId}`);
    await createAndSendNewUserTokens(request, reply, userId);
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

const createAndSendNewUserTokens = async (
  request: FastifyRequest,
  reply: FastifyReply,
  userId: number
) => {
  const accessToken = request.server.jwt.sign(
    { id: userId },
    { expiresIn: "15m" }
  );
  const refreshToken = request.server.jwt.sign(
    { id: userId },
    { expiresIn: "7d" }
  );
  const { exp: tokenExpiry } = request.server.jwt.decode(refreshToken) as {
    exp: number;
  };
  const hashedRefreshToken = await bcrypt.hash(
    refreshToken,
    config.SALT_ROUNDS
  );

  await request.server.pg.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3);",
    [userId, hashedRefreshToken, tokenExpiry]
  );

  reply
    .setCookie("refreshToken", refreshToken, {
      secure: true,
      httpOnly: true,
      sameSite: true,
    })
    .status(200)
    .send({ accessToken });
};

const deleteAllRefreshTokensForUser = async (
  request: FastifyRequest,
  reply: FastifyReply,
  userId: number
) => {
  const { rowCount }: DBRowCountType = await request.server.pg.query(
    "DELETE FROM refresh_tokens WHERE user_id = $1",
    [userId]
  );
  request.log.warn(
    `Invalid refresh token used for user ${userId}, deleted ${rowCount} tokens`
  );

  return reply
    .status(401)
    .send({ error: "Invalid token, please log in again" });
};
