import { Response } from "light-my-request";
import buildServer from "../../src/server";

declare module "fastify" {
  interface FastifyInstance {
    registerUser: (email?: string, password?: string) => Promise<Response>;
    loginUser: (email?: string, password?: string) => Promise<Response>;
  }
}

const createTestApp = async () => {
  const testApp = await buildServer();

  testApp.decorate(
    "registerUser",
    async (
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
    }
  );

  testApp.decorate(
    "loginUser",
    async (
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
    }
  );

  return testApp;
};

export default createTestApp;
