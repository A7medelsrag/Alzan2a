import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "redis";
import { type ApiConfig } from "@store/shared";
import { prisma } from "./db/prisma.js";
import { loadConfig } from "./config.js";
import { installErrorHandler } from "./errors.js";
import { installSecurityBaseline } from "./plugins/security.js";
import { installRateLimit } from "./plugins/rate-limit.js";
import { registerHealthRoutes } from "./routes/health.routes.js";
import { registerCatalogRoutes } from "./routes/catalog.routes.js";
import { registerAdminOrderRoutes, registerOrderRoutes } from "./routes/order.routes.js";
import { registerWishlistRoutes } from "./routes/wishlist.routes.js";
import { registerAdminCouponRoutes, registerCouponRoutes } from "./routes/coupon.routes.js";
import { HealthService } from "./services/health.service.js";
import { CatalogService } from "./services/catalog.service.js";
import { CatalogRepository } from "./repositories/catalog.repository.js";
import { OrderRepository } from "./repositories/order.repository.js";
import { OrderService } from "./services/order.service.js";
import { WishlistRepository } from "./repositories/wishlist.repository.js";
import { WishlistService } from "./services/wishlist.service.js";
import { CouponRepository } from "./repositories/coupon.repository.js";
import { CouponService } from "./services/coupon.service.js";
import { ReviewRepository } from "./repositories/review.repository.js";
import { ReviewService } from "./services/review.service.js";
import { registerReviewRoutes } from "./routes/review.routes.js";
import { ProductOfferRepository } from "./repositories/product-offer.repository.js";
import { ProductOfferService } from "./services/product-offer.service.js";
import { BundleRepository } from "./repositories/bundle.repository.js";
import { BundleService } from "./services/bundle.service.js";
import { registerStoreOfferRoutes, registerAdminOfferRoutes } from "./routes/offer.routes.js";
import { HomepageRepository } from "./repositories/homepage.repository.js";
import {
  registerCustomerRoutes,
  registerGoogleAuthRoute,
} from "./routes/customer.routes.js";
import { CustomerRepository } from "./repositories/customer.repository.js";
import { CustomerService } from "./services/customer.service.js";
import { RedisCustomerSessionStore, type CustomerSessionStore } from "./services/customer-session.store.js";
import { registerAdminAuthRoutes } from "./routes/admin-auth.routes.js";
import { AdminRepository } from "./repositories/admin.repository.js";
import { AdminService } from "./services/admin.service.js";
import { HomepageService } from "./services/homepage.service.js";
import { RedisAdminSessionStore, type AdminSessionStore } from "./services/admin-session.store.js";
import { registerHomepageRoutes, registerAdminHomepageRoutes } from "./routes/homepage.routes.js";
import { registerAdminMediaRoutes, registerLocalMediaReadRoute } from "./routes/media.routes.js";
import { registerAdminManagementRoutes } from "./routes/admin-management.routes.js";
import { AdminManagementService } from "./services/admin-management.service.js";
import { MediaRepository } from "./repositories/media.repository.js";
import { MediaService } from "./services/media.service.js";
import { createMediaStorage, LocalFileMediaStorage, type MediaStorage } from "./services/media-storage.js";
import {
  RedisStaffUploadRateLimitStore,
  type StaffUploadRateLimitStore,
} from "./services/staff-upload-rate-limit.store.js";
import { AdminOperationsService } from "./services/admin-operations.service.js";
import { registerAdminOperationsRoutes } from "./routes/admin-operations.routes.js";

export function buildServer(
  database: PrismaClient = prisma,
  config: ApiConfig = loadConfig(),
  customerSessionStore?: CustomerSessionStore,
  adminSessionStore?: AdminSessionStore,
  mediaStorageOverride?: MediaStorage,
  uploadRateLimitStoreOverride?: StaffUploadRateLimitStore,
): FastifyInstance {
  const trustProxy = typeof config.trustProxy === "number"
    ? (_address: string, hop: number) => hop <= (config.trustProxy as number)
    : (config.trustProxy ?? false);
  const app = Fastify({
    trustProxy,
    logger: {
      level: config.logLevel,
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.x-csrf-token",
        "req.body.password",
        "req.body.passwordConfirmation",
        "req.body.mfaCode",
      ],
    },
    bodyLimit: config.bodyLimitBytes,
    genReqId: () => randomUUID(),
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("X-Request-Id", request.id);
  });
  installSecurityBaseline(app, config);
  installRateLimit(app, config);
  installErrorHandler(app);
  app.register(cookie);
  app.register(multipart, {
    attachFieldsToBody: false,
    throwFileSizeLimit: false,
  });
  const needsRedis = !customerSessionStore || !adminSessionStore || !uploadRateLimitStoreOverride;
  const redis = config.redisUrl && needsRedis ? createClient({ url: config.redisUrl }) : undefined;
  registerHealthRoutes(app, new HealthService(database, redis));
  const catalog = new CatalogService(new CatalogRepository(database));
  const homepage = new HomepageService(new HomepageRepository(database));
  app.register(async (storeApp) => {
    registerCatalogRoutes(storeApp, catalog);
    storeApp.get("/settings", async (_request, reply) => {
      const settings = await database.storeSetting.findUnique({
        where: { id: "global" },
        select: {
          storeName: true,
          dashboardName: true,
          buttonColor: true,
          backgroundColor: true,
          supportPhone: true,
          supportWhatsApp: true,
          freeShippingThresholdCents: true,
        },
      });
      return reply.header("Cache-Control", "no-store").send({
        data: settings ?? {
          storeName: "Zan2a",
          dashboardName: "zan2a | زنقة",
          buttonColor: "#7a1535",
          backgroundColor: "#faf6f3",
          supportPhone: null,
          supportWhatsApp: null,
          freeShippingThresholdCents: 100000,
        },
      });
    });
    storeApp.get("/shipping/rates", async (_request, reply) => {
      const rates = await database.shippingRate.findMany({ where: { isEnabled: true }, orderBy: { governorate: "asc" }, select: { governorate: true, priceCents: true, minDeliveryDays: true, maxDeliveryDays: true } });
      return reply.header("Cache-Control", "public, max-age=300").send({ data: rates });
    });
  }, { prefix: "/api/v1/store" });
  app.register(async (storeApp) => {
    registerHomepageRoutes(storeApp, homepage);
  }, { prefix: "/api/v1/store/homepage" });
  const customerSessions = customerSessionStore ?? (redis ? new RedisCustomerSessionStore(redis) : undefined);
  const customers = new CustomerService(new CustomerRepository(database), customerSessions);
  app.register(async (storeApp) => {
    registerCustomerRoutes(storeApp, customers, config.googleClientId);
  }, { prefix: "/api/v1/store/customer" });
  app.register(async (storeApp) => {
    registerGoogleAuthRoute(storeApp, "/google", customers, config.googleClientId);
  }, { prefix: "/api/v1/store/auth" });
  const orderReceiptSecret = config.orderReceiptSecret ??
    (config.adminMfaEncryptionKey
      ? createHmac("sha256", config.adminMfaEncryptionKey).update("zan2a:order-receipt-v1").digest("base64url")
      : "order-receipt-secret");
  const orders = new OrderService(new OrderRepository(database), orderReceiptSecret);
  app.register(async (storeApp) => {
    registerOrderRoutes(storeApp, orders, customers);
  }, { prefix: "/api/v1/store/orders" });
  const wishlists = new WishlistService(new WishlistRepository(database));
  app.register(async (storeApp) => {
    registerWishlistRoutes(storeApp, wishlists, customers);
  }, { prefix: "/api/v1/store/wishlist" });
  const coupons = new CouponService(new CouponRepository(database));
  app.register(async (storeApp) => {
    registerCouponRoutes(storeApp, coupons);
  }, { prefix: "/api/v1/store/coupons" });
  const reviews = new ReviewService(new ReviewRepository(database));
  app.register(async (storeApp) => {
    registerReviewRoutes(storeApp, reviews, customers);
  }, { prefix: "/api/v1/store/reviews" });
  const productOffers = new ProductOfferService(new ProductOfferRepository(database));
  const bundles = new BundleService(new BundleRepository(database));
  app.register(async (storeApp) => {
    registerStoreOfferRoutes(storeApp, productOffers, bundles);
  }, { prefix: "/api/v1/store" });
  const adminSessions = adminSessionStore ?? (redis ? new RedisAdminSessionStore(redis) : undefined);
  const admins = new AdminService(new AdminRepository(database), adminSessions);
  const uploadRateLimitStore = uploadRateLimitStoreOverride ??
    (redis ? new RedisStaffUploadRateLimitStore(redis) : undefined);
  app.register(async (adminApp) => {
    registerAdminAuthRoutes(adminApp, admins, config.allowedOrigins);
  }, { prefix: "/api/v1/admin/auth" });
  app.register(async (adminApp) => {
    registerAdminHomepageRoutes(adminApp, homepage, admins, config.allowedOrigins);
  }, { prefix: "/api/v1/admin/homepage" });
  app.register(async (adminApp) => {
    registerAdminOrderRoutes(adminApp, orders, admins, config.allowedOrigins);
  }, { prefix: "/api/v1/admin/orders" });
  app.register(async (adminApp) => {
    registerAdminCouponRoutes(adminApp, coupons, admins, config.allowedOrigins);
  }, { prefix: "/api/v1/admin/coupons" });
  const adminManagement = new AdminManagementService(database);
  const adminOperations = new AdminOperationsService(database);
  app.register(async (adminApp) => {
    registerAdminOfferRoutes(adminApp, productOffers, bundles, admins, config.allowedOrigins);
    registerAdminManagementRoutes(adminApp, adminManagement, admins, config.allowedOrigins);
    registerAdminOperationsRoutes(adminApp, adminOperations, admins, config.allowedOrigins);
  }, { prefix: "/api/v1/admin" });
  const mediaStorage = mediaStorageOverride ?? createMediaStorage(config.media);
  const media = new MediaService(mediaStorage, new MediaRepository(database));
  app.register(async (adminApp) => {
    registerAdminMediaRoutes(adminApp, media, admins, config.allowedOrigins, uploadRateLimitStore);
  }, { prefix: "/api/v1/admin/media" });
  if (mediaStorage instanceof LocalFileMediaStorage) {
    app.register(async (mediaApp) => {
      registerLocalMediaReadRoute(mediaApp, mediaStorage);
    }, { prefix: "/api/v1/media" });
  }
  if (mediaStorage.close) {
    app.addHook("onClose", async () => {
      mediaStorage.close?.();
    });
  }

  if (redis) {
    redis.on("error", (error) => {
      app.log.error({ errorName: error.name }, "Session Redis error");
    });
    app.addHook("onReady", async () => {
      if (!redis.isOpen) await redis.connect();
    });
    app.addHook("onClose", async () => {
      if (redis.isOpen) await redis.quit();
    });
  }

  return app;
}

export const server = buildServer();

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"));

if (isDirectRun) {
  const config = loadConfig();

  server.listen({ port: config.port, host: config.host }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });

  let shuttingDown = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      server.close().then(
        () => process.exit(0),
        (closeErr) => {
          server.log.error(closeErr, "Error during graceful shutdown");
          process.exit(1);
        },
      );
    });
  }
}
