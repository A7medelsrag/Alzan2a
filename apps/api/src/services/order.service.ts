import { Prisma } from "@prisma/client";
import {
  displayEgyptianPhone,
  type AdminOrderListQuery,
  type AdminUpdateOrderStatusInput,
  type CreateOrderInput,
  type OrderPublic,
} from "@store/shared";
import { AppError } from "../errors.js";
import {
  CheckoutUnavailableError,
  OrderRepository,
} from "../repositories/order.repository.js";
import {
  createGuestReceiptToken,
  verifyGuestReceiptToken,
} from "./guest-receipt.js";

type RawOrderWithItems = Awaited<ReturnType<OrderRepository["findById"]>>;

const maxSerializableRetries = 3;

function isSerializationConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= maxSerializableRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isSerializationConflict(error)) throw error;
      if (attempt === maxSerializableRetries) {
        throw new AppError("CONCURRENT_MODIFICATION", 409);
      }
      await new Promise((resolve) => setTimeout(resolve, 10 * attempt));
    }
  }
  throw new AppError("CONCURRENT_MODIFICATION", 409);
}

export class OrderService {
  public constructor(
    private readonly orders: OrderRepository,
    private readonly receiptSecret: string = "default-order-receipt-secret-change-in-prod",
  ) {}

  public async create(
    input: CreateOrderInput,
    idempotencyKey: string,
    customerId?: string | null,
  ) {
    const existing = await this.orders.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const isGuest = !existing.customerId;
      const guestReceiptToken = isGuest
        ? createGuestReceiptToken(existing.id, this.receiptSecret)
        : undefined;
      return {
        data: this.toPublicOrder(existing),
        idempotentReplay: true,
        guestReceiptToken,
      };
    }

    try {
      const order = await withSerializableRetry(() =>
        this.orders.createAtomically({
          idempotencyKey,
          customerId,
          customer: input.customer,
          shippingAddress: input.shippingAddress,
          items: input.items ?? [],
          bundles: input.bundles ?? [],
          couponCode: input.couponCode,
        }),
      );

      const isGuest = !order.customerId;
      const guestReceiptToken = isGuest
        ? createGuestReceiptToken(order.id, this.receiptSecret)
        : undefined;

      return {
        data: this.toPublicOrder(order),
        idempotentReplay: false,
        guestReceiptToken,
      };
    } catch (error) {
      if (error instanceof CheckoutUnavailableError) {
        throw new AppError("OUT_OF_STOCK_OR_UNAVAILABLE", 409, error.message);
      }
      if (error instanceof AppError) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const replay = await this.orders.findByIdempotencyKey(idempotencyKey);
        if (replay) {
          const isGuest = !replay.customerId;
          const guestReceiptToken = isGuest
            ? createGuestReceiptToken(replay.id, this.receiptSecret)
            : undefined;
          return {
            data: this.toPublicOrder(replay),
            idempotentReplay: true,
            guestReceiptToken,
          };
        }
      }
      throw error;
    }
  }

  public async getOrderById(
    orderId: string,
    authenticatedCustomerId?: string,
    guestReceiptToken?: string,
  ): Promise<{ data: OrderPublic }> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new AppError("ORDER_NOT_FOUND", 404);
    }

    if (order.customerId) {
      if (!authenticatedCustomerId || authenticatedCustomerId !== order.customerId) {
        throw new AppError("ORDER_NOT_FOUND", 404);
      }
    } else {
      if (
        !guestReceiptToken ||
        !verifyGuestReceiptToken(guestReceiptToken, order.id, this.receiptSecret)
      ) {
        throw new AppError("ORDER_NOT_FOUND", 404);
      }
    }

    return { data: this.toPublicOrder(order) };
  }

  public async listCustomerOrders(
    customerId: string,
  ): Promise<{ data: OrderPublic[] }> {
    const orders = await this.orders.listByCustomerId(customerId);
    return { data: orders.map((o) => this.toPublicOrder(o)) };
  }

  public async listOrdersForAdmin(params: AdminOrderListQuery) {
    const { items, total, page, pageSize } = await this.orders.listForAdmin(params);
    return {
      data: items.map((o) => this.toPublicOrder(o)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  public async getOrderByIdForAdmin(orderId: string): Promise<{ data: OrderPublic }> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new AppError("ORDER_NOT_FOUND", 404);
    return { data: this.toPublicOrder(order) };
  }

  public async updateOrderStatusByAdmin(
    orderId: string,
    input: AdminUpdateOrderStatusInput,
    actorId?: string,
  ): Promise<{ data: OrderPublic }> {
    const existing = await this.orders.findById(orderId);
    if (!existing) throw new AppError("ORDER_NOT_FOUND", 404);

    try {
      const updated = await withSerializableRetry(() =>
        this.orders.updateStatus(orderId, input, actorId),
      );
      return { data: this.toPublicOrder(updated) };
    } catch (error) {
      if (error instanceof CheckoutUnavailableError) {
        throw new AppError("OUT_OF_STOCK_OR_UNAVAILABLE", 409, error.message);
      }
      throw error;
    }
  }

  private toPublicOrder(order: NonNullable<RawOrderWithItems>): OrderPublic {
    return {
      id: order.id,
      customerId: order.customerId ?? null,
      status: order.status,
      customerName: order.customerName,
      customerPhone: displayEgyptianPhone(order.customerPhone),
      customerEmail: order.customerEmail ?? null,
      governorate: order.governorate,
      cityArea: order.cityArea,
      detailedAddress: order.detailedAddress,
      landmark: order.landmark ?? null,
      subtotalCents: order.subtotalCents,
      shippingFeeCents: order.shippingFeeCents,
      discountCents: order.discountCents,
      offerDiscountCents: (order as { offerDiscountCents?: number }).offerDiscountCents ?? 0,
      bundleDiscountCents: (order as { bundleDiscountCents?: number }).bundleDiscountCents ?? 0,
      couponDiscountCents: (order as { couponDiscountCents?: number }).couponDiscountCents ?? 0,
      totalCents: order.totalCents,
      items: order.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        originalPriceCents: (item as { originalPriceCents?: number | null }).originalPriceCents ?? null,
        discountCents: (item as { discountCents?: number }).discountCents ?? 0,
        offerId: (item as { offerId?: string | null }).offerId ?? null,
        bundleId: (item as { bundleId?: string | null }).bundleId ?? null,
        bundleName: (item as { bundleName?: string | null }).bundleName ?? null,
        variantName: item.variant?.name,
        productName: item.variant?.product?.name,
      })),
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : (order.createdAt as unknown as string),
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : (order.updatedAt as unknown as string),
      trackingNumber: order.trackingNumber ?? null,
      courierName: order.courierName ?? null,
      couponCode: (order as { couponCode?: string | null }).couponCode ?? null,
    };
  }
}
