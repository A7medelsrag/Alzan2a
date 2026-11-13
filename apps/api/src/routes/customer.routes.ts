import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  customerAddressInputSchema,
  customerAddressParamsSchema,
  customerLoginSchema,
  customerProfileUpdateSchema,
  customerRegistrationSchema,
  googleAuthInputSchema,
} from "@store/shared";
import { AppError } from "../errors.js";
import { CustomerService, type PublicCustomer } from "../services/customer.service.js";
import { tokensMatch } from "../services/customer-session.store.js";

export const customerSessionCookieName = "__Host-customer_session";
const cookieOptions = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60,
};

export function registerGoogleAuthRoute(
  app: FastifyInstance,
  path: string,
  customers: CustomerService,
  googleClientId?: string,
): void {
  app.post(path, {
    config: { rateLimit: { max: 20, timeWindow: 15 * 60 * 1_000 } },
  }, async (request, reply) => {
    const input = googleAuthInputSchema.parse(request.body);
    const result = await customers.loginWithGoogle(
      input.credential,
      googleClientId,
      request.cookies[customerSessionCookieName],
    );
    return sendSession(reply, result, 200);
  });
}

export function registerCustomerRoutes(
  app: FastifyInstance,
  customers: CustomerService,
  googleClientId?: string,
): void {
  registerGoogleAuthRoute(app, "/auth/google", customers, googleClientId);

  app.post("/register", {
    config: { rateLimit: { max: 5, timeWindow: 60 * 60 * 1_000 } },
  }, async (request, reply) => {
    const input = customerRegistrationSchema.parse(request.body);
    const result = await customers.register(input, request.cookies[customerSessionCookieName]);
    return sendSession(reply, result, 201);
  });

  app.post("/login", {
    config: { rateLimit: { max: 20, timeWindow: 15 * 60 * 1_000 } },
  }, async (request, reply) => {
    const input = customerLoginSchema.parse(request.body);
    try {
      const result = await customers.login(input, request.cookies[customerSessionCookieName]);
      return sendSession(reply, result, 200);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        request.log.warn({
          requestId: request.id,
          ip: request.ip,
          phone: maskPhone(input.phone),
        }, "Customer login failed");
      }
      throw error;
    }
  });

  app.get("/me", async (request, reply) => {
    const session = await customers.getSession(request.cookies[customerSessionCookieName]);
    return reply.header("Cache-Control", "no-store").send(session);
  });

  app.post("/logout", async (request, reply) => {
    const sessionToken = request.cookies[customerSessionCookieName];
    if (sessionToken) {
      const session = await customers.getSession(sessionToken);
      requireCsrf(request, session.csrfToken);
      await customers.logout(sessionToken);
    }
    return reply.clearCookie(customerSessionCookieName, cookieOptions).status(204).send();
  });

  app.patch("/profile", async (request, reply) => {
    const customer = await requireCustomer(request, customers);
    const input = customerProfileUpdateSchema.parse(request.body);
    return reply.send({ data: await customers.updateProfile(customer.id, input.fullName) });
  });

  app.get("/addresses", async (request, reply) => {
    const session = await getCustomerSession(request, customers);
    return reply.send(await customers.listAddresses(session.data.id));
  });

  app.post("/addresses", async (request, reply) => {
    const customer = await requireCustomer(request, customers);
    const input = customerAddressInputSchema.parse(request.body);
    return reply.status(201).send(await customers.createAddress(customer.id, input));
  });

  app.patch("/addresses/:id", async (request, reply) => {
    const customer = await requireCustomer(request, customers);
    const params = customerAddressParamsSchema.parse(request.params);
    const input = customerAddressInputSchema.parse(request.body);
    return reply.send(await customers.updateAddress(customer.id, params.id, input));
  });

  app.delete("/addresses/:id", async (request, reply) => {
    const customer = await requireCustomer(request, customers);
    const params = customerAddressParamsSchema.parse(request.params);
    await customers.deleteAddress(customer.id, params.id);
    return reply.status(204).send();
  });
}

async function requireCustomer(request: FastifyRequest, customers: CustomerService) {
  const session = await getCustomerSession(request, customers);
  requireCsrf(request, session.csrfToken);
  return session.data;
}

function getCustomerSession(request: FastifyRequest, customers: CustomerService) {
  return customers.getSession(request.cookies[customerSessionCookieName]);
}

function requireCsrf(request: FastifyRequest, expectedToken: string): void {
  const token = request.headers["x-csrf-token"];
  if (typeof token !== "string" || !tokensMatch(token, expectedToken)) {
    throw new AppError("CSRF_VALIDATION_FAILED", 403);
  }
}

export function sendSession(
  reply: FastifyReply,
  session: { data: PublicCustomer; csrfToken: string; sessionToken: string },
  statusCode: number,
) {
  const { sessionToken, ...response } = session;
  return reply
    .setCookie(customerSessionCookieName, sessionToken, cookieOptions)
    .header("Cache-Control", "no-store")
    .status(statusCode)
    .send(response);
}

function maskPhone(phone: string): string {
  return `*******${phone.slice(-4)}`;
}
