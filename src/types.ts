import { Type, type Static } from "@sinclair/typebox";

export const User = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({
    minLength: 8,
    maxLength: 40,
  }),
});

export type UserType = Static<typeof User>;

// TODO Split out a NoteCreate object?
export const Note = Type.Object({
  id: Type.Optional(Type.Integer()),
  title: Type.String(),
  body: Type.String(),
});

export type NoteType = Static<typeof Note>;

export const SuccessfullResponse = Type.Object({
  message: Type.String(),
});

export const ErrorResponse = Type.Object({
  error: Type.String(),
});

export const TokenCreatedResponse = Type.Object({
  token: Type.String(),
});
