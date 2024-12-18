import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import createTestApp from "./setup";

describe("notes routes", async () => {
  const testApp = await createTestApp();
  after(async () => await testApp.close());

  let accessToken: string;
  let userId: number;

  before(async () => {
    await testApp.registerUser();
    const loginResponse = await testApp.loginUser();
    accessToken = loginResponse.json().accessToken;
    const { id } = testApp.jwt.decode(accessToken) as {
      id: number;
    };
    userId = id;
  });

  beforeEach(async () => {
    await testApp.pg.query("TRUNCATE TABLE notes RESTART IDENTITY;");
  });

  describe("GET /notes", async () => {
    await it("fetches a paginated list of notes for user", async () => {
      for (let i = 1; i <= 5; i++) {
        await testApp.pg.query(
          "INSERT INTO notes (title, body, user_id) VALUES ($1, $2, $3);",
          [`note ${i}`, "some body", userId]
        );
      }

      const response = await testApp.inject({
        method: "GET",
        url: "/notes?offset=2&limit=2",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      assert.equal(response.statusCode, 200);

      const notes = response.json();

      assert.deepEqual(notes, [
        {
          id: 3,
          title: "note 3",
          body: "some body",
        },
        {
          id: 4,
          title: "note 4",
          body: "some body",
        },
      ]);
    });
  });

  await it("defaults to the first results if no pagination args provided", async () => {
    for (let i = 1; i <= 5; i++) {
      await testApp.pg.query(
        "INSERT INTO notes (title, body, user_id) VALUES ($1, $2, $3);",
        [`note ${i}`, "some body", userId]
      );
    }

    const response = await testApp.inject({
      method: "GET",
      url: "/notes",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    assert.equal(response.statusCode, 200);

    const notes = response.json();

    assert.deepEqual(notes.length, 5);
  });

  await it("blocks requesting more data than the app specified pagination limit", async () => {
    const response = await testApp.inject({
      method: "GET",
      url: "/notes?limit=999",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    assert.equal(response.statusCode, 400);
  });

  describe("GET /notes/:id", () => {
    it("fetches specified note for user", async () => {
      const { rows } = await testApp.pg.query(
        "INSERT INTO notes (title, body, user_id) VALUES ($1, $2, $3) RETURNING id;",
        ["note1", "first body", userId]
      );
      const noteId = Number(rows[0].id);

      const response = await testApp.inject({
        method: "GET",
        url: `/notes/${noteId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      assert.equal(response.statusCode, 200);

      const note = response.json();

      assert.deepEqual(note, {
        id: noteId,
        title: "note1",
        body: "first body",
      });
    });

    it("errors with not found when note does not exist", async () => {
      const response = await testApp.inject({
        method: "GET",
        url: `/notes/${999}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      assert.equal(response.statusCode, 404);

      assert.equal(response.json().error, "Note not found");
    });
  });

  describe("POST /notes", () => {
    it("creates a new note for the user", async () => {
      const title = "new note";
      const body = "note body";

      const response = await testApp.inject({
        method: "POST",
        url: "/notes",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        body: {
          title,
          body,
        },
      });
      assert.equal(response.statusCode, 201);

      const note = response.json();

      assert.deepEqual(note, {
        id: 1,
        title,
        body,
      });
    });
  });

  describe("PUT /notes/:id", () => {
    it("updates a user note with provided values", async () => {
      const { rows } = await testApp.pg.query(
        "INSERT INTO notes (title, body, user_id) VALUES ($1, $2, $3) RETURNING id;",
        ["note1", "first body", userId]
      );
      const noteId = Number(rows[0].id);

      const title = "updated title";
      const body = "updated title";

      const response = await testApp.inject({
        method: "PUT",
        url: `/notes/${noteId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        body: {
          title,
          body,
        },
      });
      assert.equal(response.statusCode, 200);

      const note = response.json();

      assert.deepEqual(note, {
        id: noteId,
        title,
        body,
      });
    });

    it("errors with not found when note does not exist", async () => {
      const response = await testApp.inject({
        method: "PUT",
        url: `/notes/${999}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        body: {
          title: "any",
          body: "any",
        },
      });
      assert.equal(response.statusCode, 404);

      assert.equal(response.json().error, "Note not found");
    });
  });

  describe("DELETE /notes/:id", () => {
    it("deletes the user note", async () => {
      const { rows } = await testApp.pg.query(
        "INSERT INTO notes (title, body, user_id) VALUES ($1, $2, $3) RETURNING id;",
        ["note1", "first body", userId]
      );
      const noteId = Number(rows[0].id);

      const response = await testApp.inject({
        method: "DELETE",
        url: `/notes/${noteId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      assert.equal(response.statusCode, 200);

      assert.equal(response.json().message, "Note deleted successfully");
    });

    it("errors with not found when note does not exist", async () => {
      const response = await testApp.inject({
        method: "DELETE",
        url: `/notes/${999}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      assert.equal(response.statusCode, 404);

      assert.equal(response.json().error, "Note not found");
    });
  });
});
