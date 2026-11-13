import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { adminLoginSchema, type ApiConfig } from "@store/shared";
import { AppError } from "../errors.js";
import { AdminService } from "../services/admin.service.js";
import { tokensMatch } from "../services/customer-session.store.js";

export const adminSessionCookieName = "__Host-admin_session";
const cookieOptions = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  maxAge: 8 * 60 * 60,
};

export function registerAdminAuthRoutes(
  app: FastifyInstance,
  admins: AdminService,
  allowedOrigins: ApiConfig["allowedOrigins"],
): void {
  app.post("/login", {
    config: { rateLimit: { max: 10, timeWindow: 15 * 60 * 1_000 } },
  }, async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const input = adminLoginSchema.parse(request.body);
    try {
      const result = await admins.login(input, request.cookies[adminSessionCookieName]);
      return sendSession(reply, result, 200);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        request.log.warn({
          requestId: request.id,
          ip: request.ip,
        }, "Admin login failed");
      }
      throw error;
    }
  });

  app.get("/me", async (request, reply) => {
    const session = await admins.getSession(request.cookies[adminSessionCookieName]);
    return reply.header("Cache-Control", "no-store").send(session);
  });

  app.post("/logout", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const sessionToken = request.cookies[adminSessionCookieName];
    if (sessionToken) {
      const session = await admins.getSession(sessionToken);
      requireCsrf(request, session.csrfToken);
      await admins.logout(sessionToken);
    }
    return reply.clearCookie(adminSessionCookieName, cookieOptions).status(204).send();
  });
}

export function requireAdminOrigin(request: FastifyRequest, allowedOrigins: string[]): void {
  const origin = request.headers.origin;
  if (!origin || !allowedOrigins.includes(origin)) {
    throw new AppError("ORIGIN_NOT_ALLOWED", 403);
  }
}

export function requireCsrf(request: FastifyRequest, expectedToken: string): void {
  const token = request.headers["x-csrf-token"];
  if (typeof token !== "string" || !tokensMatch(token, expectedToken)) {
    throw new AppError("CSRF_VALIDATION_FAILED", 403);
  }
}

function sendSession(
  reply: FastifyReply,
  session: { data: { id: string; username: string; role: string }; csrfToken: string; sessionToken: string },
  statusCode: number,
) {
  const { sessionToken, ...response } = session;
  return reply
    .setCookie(adminSessionCookieName, sessionToken, cookieOptions)
    .header("Cache-Control", "no-store")
    .status(statusCode)
    .send(response);
}
