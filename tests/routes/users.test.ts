import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import buildServer from "../../src/server.ts";
import { nowInSeconds } from "../../src/utils.ts";

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

  const loginUser = async (
    email: string = "test@email.com",
    password: string = "password1"
  ) => {
    return await testApp.inject({
      method: "POST",
      url: "/login",
      body: {
        email,
        password,
      },
    });
  };

  describe("POST /register", async () => {
    it("creates new user", async () => {
      const response = await testApp.inject({
        method: "POST",
        url: "/register",
        body: {
          email: "test@email.com",
          password: "password1",
        },
      });
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
    it("logs in user and creates access and refresh tokens", async () => {
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

      assert.strictEqual(response.cookies.length, 1);

      const cookie = response.cookies[0];
      assert.strictEqual(cookie.name, "refreshToken");
      assert.strictEqual(cookie.sameSite, "Strict");
      assert(cookie.httpOnly);
      assert(cookie.secure);
      assert(cookie.value);
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

  describe("GET /refreshToken", async () => {
    it("creates new access and refresh tokens for user with valid refresh token", async (context) => {
      await registerUser();
      const loginResponse = await loginUser();
      const loginAccessToken = loginResponse.json().accessToken;
      const loginRefreshToken = loginResponse.cookies[0].value;
      // Need to mock the time here so we can test the access tokens are different.
      // Currently only difference is the timestamp and these are the same without this.
      context.mock.timers.enable({
        apis: ["Date"],
        now: (nowInSeconds() + 1) * 1000,
      });

      const response = await testApp.inject({
        method: "GET",
        url: "/refreshToken",
        cookies: {
          refreshToken: loginRefreshToken,
        },
      });
      assert.strictEqual(response.statusCode, 200);

      const responseAccessToken = response.json().accessToken;
      assert(responseAccessToken);
      assert.notStrictEqual(responseAccessToken, loginAccessToken);

      assert.strictEqual(response.cookies.length, 1);

      const responseRefreshToken = response.cookies[0];
      assert.notStrictEqual(responseRefreshToken, loginRefreshToken);

      assert.strictEqual(responseRefreshToken.name, "refreshToken");
      assert.strictEqual(responseRefreshToken.sameSite, "Strict");
      assert(responseRefreshToken.httpOnly);
      assert(responseRefreshToken.secure);
      assert(responseRefreshToken.value);
    });
  });

  it("errors if refresh token is not sent in the cookies", async () => {
    await registerUser();
    await loginUser();

    const response = await testApp.inject({
      method: "GET",
      url: "/refreshToken",
    });
    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(response.json().error, "No refresh token in cookies");
  });

  it("errors and deletes refresh token if refresh token is expired", async (context) => {
    await registerUser();
    const loginResponse = await loginUser();
    assert.strictEqual(loginResponse.cookies.length, 1);
    const loginRefreshToken = loginResponse.cookies[0].value;

    const { rowCount: rowCountBefore } = await testApp.pg.query(
      "SELECT id FROM refresh_tokens;"
    );
    assert.strictEqual(rowCountBefore, 1);

    const { exp: tokenExpiry } = testApp.jwt.decode(loginRefreshToken) as {
      exp: number;
    };

    context.mock.timers.enable({
      apis: ["Date"],
      now: (tokenExpiry + 1) * 1000,
    });

    const response = await testApp.inject({
      method: "GET",
      url: "/refreshToken",
      cookies: {
        refreshToken: loginRefreshToken,
      },
    });
    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(
      response.json().error,
      "Token expired, please log in again"
    );

    const { rowCount: rowCountAfter } = await testApp.pg.query(
      "SELECT id FROM refresh_tokens;"
    );
    assert.strictEqual(rowCountAfter, 0);
  });

  it("errors and deletes refresh token if refresh token is invalid", async () => {
    // TODO Test it deletes all user refresh tokens if multiple devices are implemented
    await registerUser();
    const loginResponse = await loginUser();
    assert.strictEqual(loginResponse.cookies.length, 1);

    const { rowCount: rowCountBefore } = await testApp.pg.query(
      "SELECT id FROM refresh_tokens;"
    );
    assert.strictEqual(rowCountBefore, 1);

    const { id: userId, exp: tokenExpiry } = testApp.jwt.decode(
      loginResponse.cookies[0].value
    ) as { id: number; exp: number };

    const invalidRefreshToken = testApp.jwt.sign(
      { id: userId },
      { expiresIn: tokenExpiry + 1 }
    );

    const response = await testApp.inject({
      method: "GET",
      url: "/refreshToken",
      cookies: {
        refreshToken: invalidRefreshToken,
      },
    });
    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(
      response.json().error,
      "Invalid token, please log in again"
    );

    const { rowCount: rowCountAfter } = await testApp.pg.query(
      "SELECT id FROM refresh_tokens;"
    );
    assert.strictEqual(rowCountAfter, 0);
  });
});
