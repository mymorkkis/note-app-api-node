import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { nowInSeconds } from "../../src/utils.ts";
import createTestApp from "./setup.ts";

describe("user routes", async () => {
  const testApp = await createTestApp();
  after(async () => await testApp.close());

  beforeEach(async () => {
    await testApp.pg.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE;");
  });

  describe("POST /register", async () => {
    it("creates new user", async () => {
      const response = await testApp.inject({
        method: "POST",
        url: "/register",
        body: {
          email: "new-user@email.com",
          password: "password1",
        },
      });
      assert.equal(response.statusCode, 201);

      assert.equal(response.json().message, "User registered successfully");
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
      assert.equal(response.statusCode, 409);
      assert.equal(response.json().error, "Already registered");
    });
  });

  describe("POST /login", async () => {
    it("logs in user and creates access and refresh tokens", async () => {
      const email = "test@email.com";
      const password = "password1";

      await testApp.registerUser(email, password);

      const response = await testApp.inject({
        method: "POST",
        url: "/login",
        body: {
          email,
          password,
        },
      });
      assert.equal(response.statusCode, 200);
      assert(response.json().accessToken);

      assert.equal(response.cookies.length, 1);

      const cookie = response.cookies[0];
      assert.equal(cookie.name, "refreshToken");
      assert.equal(cookie.sameSite, "Strict");
      assert(cookie.httpOnly);
      assert(cookie.secure);
      assert(cookie.value);
    });

    it("errors when user is not registered", async () => {
      const response = await testApp.inject({
        method: "POST",
        url: "/login",
        body: {
          email: "test@user.com",
          password: "password1",
        },
      });
      assert.equal(response.statusCode, 404);
      assert.equal(response.json().error, "Invalid email or password");
    });

    it("errors when user enters incorrect password", async () => {
      const email = "test@user.com";

      await testApp.registerUser(email, "password1");

      const response = await testApp.inject({
        method: "POST",
        url: "/login",
        body: {
          email,
          password: "wrong password",
        },
      });
      assert.equal(response.statusCode, 404);
      assert.equal(response.json().error, "Invalid email or password");
    });
  });

  describe("GET /refreshToken", async () => {
    it("creates new access and refresh tokens for user with valid refresh token", async (context) => {
      await testApp.registerUser();
      const loginResponse = await testApp.loginUser();
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
      assert.equal(response.statusCode, 200);

      const responseAccessToken = response.json().accessToken;
      assert(responseAccessToken);
      assert.notEqual(responseAccessToken, loginAccessToken);

      assert.equal(response.cookies.length, 1);

      const responseRefreshToken = response.cookies[0];
      assert.notEqual(responseRefreshToken, loginRefreshToken);

      assert.equal(responseRefreshToken.name, "refreshToken");
      assert.equal(responseRefreshToken.sameSite, "Strict");
      assert(responseRefreshToken.httpOnly);
      assert(responseRefreshToken.secure);
      assert(responseRefreshToken.value);
    });
  });

  it("errors if refresh token is not sent in the cookies", async () => {
    await testApp.registerUser();
    await testApp.loginUser();

    const response = await testApp.inject({
      method: "GET",
      url: "/refreshToken",
    });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, "No refresh token in cookies");
  });

  it("errors and deletes refresh token if refresh token is expired", async (context) => {
    await testApp.registerUser();
    const loginResponse = await testApp.loginUser();
    assert.equal(loginResponse.cookies.length, 1);
    const loginRefreshToken = loginResponse.cookies[0].value;

    const { rowCount: rowCountBefore } = await testApp.pg.query(
      "SELECT id FROM refresh_tokens;"
    );
    assert.equal(rowCountBefore, 1);

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
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, "Token expired, please log in again");

    const { rowCount: rowCountAfter } = await testApp.pg.query(
      "SELECT id FROM refresh_tokens;"
    );
    assert.equal(rowCountAfter, 0);
  });

  it("errors and deletes refresh token if refresh token is invalid", async () => {
    // TODO Test it deletes all user refresh tokens if multiple devices are implemented
    await testApp.registerUser();
    const loginResponse = await testApp.loginUser();
    assert.equal(loginResponse.cookies.length, 1);

    const { rowCount: rowCountBefore } = await testApp.pg.query(
      "SELECT id FROM refresh_tokens;"
    );
    assert.equal(rowCountBefore, 1);

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
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, "Invalid token, please log in again");

    const { rowCount: rowCountAfter } = await testApp.pg.query(
      "SELECT id FROM refresh_tokens;"
    );
    assert.equal(rowCountAfter, 0);
  });
});
