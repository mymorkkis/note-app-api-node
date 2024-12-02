import { Type, type Static } from "@sinclair/typebox";

export const User = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({
    minLength: 8,
    maxLength: 40,
  }),
});

export type UserType = Static<typeof User>;

export const NoteInput = Type.Object({
  title: Type.String(),
  body: Type.String(),
});

export type NoteInputType = Static<typeof NoteInput>;

export const Note = Type.Intersect([
  NoteInput,
  Type.Object({
    id: Type.Integer(),
  }),
]);

export type NoteType = Static<typeof Note>;

export type RefreshTokenType = { id: number; token: string };

export type DBRowCountType = { rowCount: number | null };

export const SuccessfullResponse = Type.Object({
  message: Type.String(),
});

export const ErrorResponse = Type.Object({
  error: Type.String(),
});

export const TokenCreatedResponse = Type.Object({
  accessToken: Type.String(),
});
