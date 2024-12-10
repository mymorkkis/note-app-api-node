import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import buildServer from "../../src/server.ts";

describe("user routes", async () => {
  const testApp = await buildServer();
  after(async () => await testApp.close());

  beforeEach(async () => {
    await testApp.pg.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE;");
  });

  const registerUser = async (
    email: string = "test@email.com",
    password: string = "password1"
  ) => {
    return await testApp.inject({
      method: "POST",
      url: "/register",
      body: {
        email,
        password,
      },
    });
  };

  describe("POST /register", async () => {
    it("creates new user", async () => {
      const response = await registerUser();
      assert.strictEqual(response.statusCode, 201);

      assert.strictEqual(
        response.json().message,
        "User registered successfully"
      );
    });

    it("rejects attempt to register with duplicate email", async () => {
      const email = "test@email.com";
      const password = "password1";

      await testApp.pg.query(
        "INSERT INTO users (email, password) VALUES ($1, $2)",
        [email, password]
      );

      const response = await testApp.inject({
        method: "POST",
        url: "/register",
        body: {
          email: email,
          password: password,
        },
      });
      assert.strictEqual(response.statusCode, 409);
      assert.strictEqual(response.json().error, "Already registered");
    });
  });

  describe("POST /login", async () => {
    it("logs in user", async () => {
      const email = "test@email.com";
      const password = "password1";

      await registerUser(email, password);

      const response = await testApp.inject({
        method: "POST",
        url: "/login",
        body: {
          email,
          password,
        },
      });
      assert.strictEqual(response.statusCode, 200);
      assert(response.json().accessToken);
    });

    it("errors when user is not registered", async () => {
      const response = await testApp.inject({
        method: "POST",
        url: "/login",
        body: {
          email: "non-registered@user.com",
          password: "password1",
        },
      });
      assert.strictEqual(response.statusCode, 404);
      assert.strictEqual(response.json().error, "Invalid email or password");
    });

    it("errors when user enters incorrect password", async () => {
      const email = "test@user.com";

      await registerUser(email, "password1");

      const response = await testApp.inject({
        method: "POST",
        url: "/login",
        body: {
          email,
          password: "wrong password",
        },
      });
      assert.strictEqual(response.statusCode, 404);
      assert.strictEqual(response.json().error, "Invalid email or password");
    });
  });
});
