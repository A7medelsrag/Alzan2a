import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  adminOrderListQuerySchema,
  adminUpdateOrderStatusSchema,
  createOrderSchema,
  hasAdminPermission,
  idempotencyKeySchema,
  orderParamsSchema,
} from "@store/shared";
import { AppError } from "../errors.js";
import type { AdminService } from "../services/admin.service.js";
import type { CustomerService } from "../services/customer.service.js";
import type { OrderService } from "../services/order.service.js";
import { adminSessionCookieName, requireAdminOrigin, requireCsrf } from "./admin-auth.routes.js";
import { customerSessionCookieName } from "./customer.routes.js";

export const guestReceiptCookieName = "__Host-guest_receipt";

const receiptCookieOptions = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60,
};

export function registerOrderRoutes(
  app: FastifyInstance,
  orders: OrderService,
  customers?: CustomerService,
): void {
  app.post("/", {
    config: { rateLimit: { max: 30, timeWindow: 15 * 60 * 1_000 } },
  }, async (request, reply) => {
    const rawIdempotencyKey = request.headers["idempotency-key"];
    const idempotencyKey = idempotencyKeySchema.parse(rawIdempotencyKey);
    const input = createOrderSchema.parse(request.body);

    const session = await getAuthenticatedCustomerSession(request, customers);
    if (session) {
      requireCsrf(request, session.csrfToken);
    }
    const result = await orders.create(input, idempotencyKey, session?.data.id);

    if (result.guestReceiptToken) {
      reply.setCookie(guestReceiptCookieName, result.guestReceiptToken, receiptCookieOptions);
    }

    const statusCode = result.idempotentReplay ? 200 : 201;
    return reply.status(statusCode).send({
      data: result.data,
      ...(result.guestReceiptToken ? { guestReceiptToken: result.guestReceiptToken } : {}),
    });
  });

  app.get("/:id", async (request, reply) => {
    const params = orderParamsSchema.parse(request.params);
    const session = await getAuthenticatedCustomerSession(request, customers);
    const guestReceiptToken =
      request.cookies[guestReceiptCookieName] ??
      (typeof request.headers["x-guest-receipt-token"] === "string"
        ? request.headers["x-guest-receipt-token"]
        : undefined);

    const result = await orders.getOrderById(params.id, session?.data.id, guestReceiptToken);
    return reply.send(result);
  });

  app.get("/", async (request, reply) => {
    const session = await getAuthenticatedCustomerSession(request, customers);
    if (!session) {
      throw new AppError("CUSTOMER_UNAUTHENTICATED", 401);
    }

    const result = await orders.listCustomerOrders(session.data.id);
    return reply.send(result);
  });
}

async function getAuthenticatedCustomerSession(
  request: FastifyRequest,
  customers?: CustomerService,
) {
  if (!customers) return undefined;
  const sessionToken = request.cookies[customerSessionCookieName];
  if (!sessionToken) return undefined;
  try {
    return await customers.getSession(sessionToken);
  } catch {
    return undefined;
  }
}

export function registerAdminOrderRoutes(
  app: FastifyInstance,
  orders: OrderService,
  admins: AdminService,
  allowedOrigins: string[],
): void {
  app.get("/", async (request, reply) => {
    await requireOrderViewer(request, admins);
    const query = adminOrderListQuerySchema.parse(request.query);
    return reply.header("Cache-Control", "no-store").send(await orders.listOrdersForAdmin(query));
  });

  app.get("/:id", async (request, reply) => {
    await requireOrderViewer(request, admins);
    const params = orderParamsSchema.parse(request.params);
    return reply.header("Cache-Control", "no-store").send(await orders.getOrderByIdForAdmin(params.id));
  });

  app.patch("/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireOrderAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const params = orderParamsSchema.parse(request.params);
    const input = adminUpdateOrderStatusSchema.parse(request.body);
    const result = await orders.updateOrderStatusByAdmin(params.id, input, session.data.id);
    return reply.send(result);
  });
}

async function requireOrderAdmin(request: FastifyRequest, admins: AdminService) {
  const session = await admins.getSession(request.cookies[adminSessionCookieName]);
  if (!hasAdminPermission(session.data.role, "manageOrders")) {
    throw new AppError("ADMIN_FORBIDDEN", 403);
  }
  return session;
}

async function requireOrderViewer(request: FastifyRequest, admins: AdminService) {
  const session = await admins.getSession(request.cookies[adminSessionCookieName]);
  if (!hasAdminPermission(session.data.role, "viewOrders")) throw new AppError("ADMIN_FORBIDDEN", 403);
  return session;
}
