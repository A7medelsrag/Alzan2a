import { z } from "zod";

export { z };
import { normalizeEgyptianPhone } from "./phone.js";

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(24),
  })
  .strict();

export const productListQuerySchema = paginationSchema.extend({
  category: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const storeProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  imageUrl: z.string().url().nullable().optional(),
  category: z.object({ name: z.string(), slug: z.string() }),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    priceCents: z.number().int(),
    stockQuantity: z.number().int().nonnegative(),
  })),
});
export type StoreProduct = z.infer<typeof storeProductSchema>;

export const productListResponseSchema = z.object({
  data: z.array(storeProductSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const productDetailResponseSchema = z.object({
  data: storeProductSchema,
});

export type ProductDetailResponse = z.infer<typeof productDetailResponseSchema>;

export const categoryListResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    parentId: z.string().nullable(),
    imageUrl: z.string().url().nullable(),
    bannerImageUrl: z.string().url().nullable(),
  })),
});
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;

export const homepageSectionTypeSchema = z.enum([
  "CATEGORIES",
  "NEW_ARRIVALS",
  "BEST_SELLERS",
  "FEATURED_COLLECTIONS",
  "SEASONAL_OFFERS",
  "BRAND_STORY",
  "RECENTLY_VIEWED",
  "BENEFITS",
  "NEWSLETTER",
  "SOCIAL",
]);

export const homepageBannerSlotSchema = z.enum(["ANNOUNCEMENT", "HERO", "PROMOTION"]);

const httpsImageUrlSchema = z.string().url().refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
});
const hasControlCharacters = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
const safeLinkUrlSchema = z.string().trim().min(1).max(2048).refine((value) => {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !hasControlCharacters(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
});
const scheduleSchema = {
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
};

const homepageSectionBaseSchema = z.object({
  type: homepageSectionTypeSchema,
  title: z.string().trim().max(120),
  subtitle: z.string().trim().max(240).nullable().optional(),
  description: z.string().trim().max(1_500).nullable().optional(),
  imageUrl: httpsImageUrlSchema.nullable().optional(),
  buttonLabel: z.string().trim().max(80).nullable().optional(),
  linkUrl: safeLinkUrlSchema.nullable().optional(),
  isEnabled: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
  ...scheduleSchema,
  productIds: z.array(z.string().uuid()).max(24).default([]),
  categoryIds: z.array(z.string().uuid()).max(24).default([]),
}).strict();

function validateSchedule(
  value: { startsAt?: string | null; endsAt?: string | null },
  context: z.RefinementCtx,
): void {
  if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End date must be after start date" });
  }
}

export const homepageSectionInputSchema = homepageSectionBaseSchema.superRefine(validateSchedule);

const homepageBannerBaseSchema = z.object({
  slot: homepageBannerSlotSchema,
  title: z.string().trim().max(120).nullable().optional(),
  subtitle: z.string().trim().max(240).nullable().optional(),
  desktopImageUrl: httpsImageUrlSchema.nullable().optional(),
  mobileImageUrl: httpsImageUrlSchema.nullable().optional(),
  buttonLabel: z.string().trim().max(80).nullable().optional(),
  linkUrl: safeLinkUrlSchema.nullable().optional(),
  overlayColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  overlayOpacity: z.number().int().min(0).max(80),
  blur: z.number().int().min(0).max(20),
  isEnabled: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
  ...scheduleSchema,
}).strict();

export const homepageBannerInputSchema = homepageBannerBaseSchema.superRefine((value, context) => {
  validateSchedule(value, context);
  if (!value.title && !value.subtitle && !value.desktopImageUrl) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["title"], message: "A banner needs text or an image" });
  }
  if (value.buttonLabel && !value.linkUrl) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["linkUrl"], message: "A button needs a destination" });
  }
});

export const homepageResponseSchema = z.object({
  data: z.object({
    banners: z.array(z.object({
      id: z.string(),
      slot: homepageBannerSlotSchema,
      title: z.string().nullable(),
      subtitle: z.string().nullable(),
      desktopImageUrl: httpsImageUrlSchema.nullable(),
      mobileImageUrl: httpsImageUrlSchema.nullable(),
      buttonLabel: z.string().nullable(),
      linkUrl: safeLinkUrlSchema.nullable(),
      overlayColor: z.string(),
      overlayOpacity: z.number().int(),
      blur: z.number().int(),
    })),
    sections: z.array(z.object({
      id: z.string(),
      type: homepageSectionTypeSchema,
      title: z.string(),
      subtitle: z.string().nullable(),
      description: z.string().nullable(),
      imageUrl: httpsImageUrlSchema.nullable(),
      buttonLabel: z.string().nullable(),
      linkUrl: safeLinkUrlSchema.nullable(),
      products: z.array(storeProductSchema),
      categories: categoryListResponseSchema.shape.data,
    })),
  }),
});

export const adminHomepageResponseSchema = z.object({
  data: z.object({
    sections: z.array(homepageSectionBaseSchema.extend({
      id: z.string().uuid(),
    }).superRefine(validateSchedule)),
    banners: z.array(homepageBannerBaseSchema.extend({
      id: z.string().uuid(),
    }).superRefine((value, context) => {
      validateSchedule(value, context);
      if (!value.title && !value.subtitle && !value.desktopImageUrl) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["title"], message: "A banner needs text or an image" });
      }
      if (value.buttonLabel && !value.linkUrl) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["linkUrl"], message: "A button needs a destination" });
      }
    })),
    products: z.array(z.object({ id: z.string().uuid(), name: z.string(), imageUrl: httpsImageUrlSchema.nullable() })),
    categories: categoryListResponseSchema.shape.data,
  }),
});

export const productImageUpdateSchema = z.object({
  imageUrl: httpsImageUrlSchema.nullable(),
}).strict();

export const categoryImageUpdateSchema = z.object({
  imageUrl: httpsImageUrlSchema.nullable(),
  bannerImageUrl: httpsImageUrlSchema.nullable(),
}).strict();

export const homepageReorderSchema = z.object({
  ids: z.array(z.string().uuid()).max(40).refine((ids) => new Set(ids).size === ids.length),
}).strict();

export type HomepageResponse = z.infer<typeof homepageResponseSchema>;
export type HomepageSectionInput = z.infer<typeof homepageSectionInputSchema>;
export type HomepageBannerInput = z.infer<typeof homepageBannerInputSchema>;
export type AdminHomepageResponse = z.infer<typeof adminHomepageResponseSchema>;

const customerPhoneSchema = z.string().trim().min(10).max(16).transform((value, context) => {
  const normalized = normalizeEgyptianPhone(value);
  if (!normalized) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid Egyptian mobile number" });
    return z.NEVER;
  }
  return normalized;
});

const commonPasswordBlocklist = new Set([
  "123456789012345",
  "1234567890123456",
  "password123456789",
  "qwerty123456789",
  "111111111111111",
]);

const customerPasswordSchema = z.string()
  .min(15)
  .max(128)
  .refine((password) => !commonPasswordBlocklist.has(password.toLowerCase()), {
    message: "Choose a less common password",
  });

export const customerRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: customerPhoneSchema,
  password: customerPasswordSchema,
  passwordConfirmation: z.string().min(15).max(128),
}).strict().superRefine((value, context) => {
  if (value.password !== value.passwordConfirmation) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passwords do not match",
      path: ["passwordConfirmation"],
    });
  }
});

export type CustomerRegistrationInput = z.infer<typeof customerRegistrationSchema>;

export const customerLoginSchema = z.object({
  phone: customerPhoneSchema,
  password: z.string().min(1).max(128),
}).strict();

export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;

export const customerProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
}).strict();

export const customerAddressInputSchema = z.object({
  label: z.string().trim().min(1).max(40),
  governorate: z.string().trim().min(2).max(80),
  cityArea: z.string().trim().min(2).max(100),
  detailedAddress: z.string().trim().min(5).max(300),
  landmark: z.string().trim().max(120).optional().default(""),
}).strict();

export type CustomerAddressInput = z.infer<typeof customerAddressInputSchema>;
export const customerAddressParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const googleAuthInputSchema = z.object({
  credential: z.string().trim().min(10).max(8192),
}).strict();
export type GoogleAuthInput = z.infer<typeof googleAuthInputSchema>;

export const customerPublicSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
}).strict();
export type CustomerPublic = z.infer<typeof customerPublicSchema>;

export const customerSessionResponseSchema = z.object({
  data: customerPublicSchema,
  csrfToken: z.string().min(32),
}).strict();

export const customerAddressSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  governorate: z.string(),
  cityArea: z.string(),
  detailedAddress: z.string(),
  landmark: z.string().nullable(),
}).strict();
export type CustomerAddress = z.infer<typeof customerAddressSchema>;

export const customerAddressListResponseSchema = z.object({
  data: z.array(customerAddressSchema),
}).strict();

export const adminLoginSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(64).regex(/^[a-z0-9._@-]+$/),
  password: z.string().min(1).max(128),
  mfaCode: z.string().trim().min(6).max(32).optional(),
}).strict();

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const adminPublicSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  role: z.enum(["OWNER", "MANAGER", "INVENTORY", "ACCOUNTANT", "SUPPORT"]),
}).strict();
export type AdminRole = z.infer<typeof adminPublicSchema>["role"];

export const adminSessionResponseSchema = z.object({
  data: adminPublicSchema,
  csrfToken: z.string().min(32),
}).strict();

export const checkoutItemSchema = z
  .object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20),
  })
  .strict();

export const orderCustomerInputSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().refine((val) => normalizeEgyptianPhone(val) !== null, {
    message: "A valid Egyptian mobile number is required (+201... or 01...)",
  }),
  backupPhone: z.string().trim().refine((val) => normalizeEgyptianPhone(val) !== null, {
    message: "A valid Egyptian mobile number is required for backup phone",
  }).optional().nullable(),
  email: z.string().trim().email().toLowerCase().max(254).optional().nullable(),
}).strict();

export const orderShippingAddressInputSchema = z.object({
  governorate: z.string().trim().min(2).max(60),
  cityArea: z.string().trim().min(2).max(120),
  detailedAddress: z.string().trim().min(5).max(300),
  landmark: z.string().trim().max(200).optional().nullable(),
}).strict();

export const orderBundleItemInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
}).strict();
export type OrderBundleItemInput = z.infer<typeof orderBundleItemInputSchema>;

export const orderBundleInputSchema = z.object({
  bundleId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20).default(1),
  selectedVariants: z.array(orderBundleItemInputSchema).min(1),
}).strict();
export type OrderBundleInput = z.infer<typeof orderBundleInputSchema>;

/** Deliberately excludes price, totals, discounts, and stock: the server owns them. */
export const createOrderSchema = z
  .object({
    customer: orderCustomerInputSchema,
    shippingAddress: orderShippingAddressInputSchema,
    items: z.array(checkoutItemSchema).max(50).default([]),
    bundles: z.array(orderBundleInputSchema).max(20).optional(),
    couponCode: z.string().trim().max(30).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const bundleCount = value.bundles ? value.bundles.length : 0;
    if (value.items.length === 0 && bundleCount === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "يجب أن يحتوي الطلب على منتج أو باقة واحدة على الأقل",
        path: ["items"],
      });
    }
    const seen = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (seen.has(item.variantId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A variant can only appear once in an order",
          path: ["items", index, "variantId"],
        });
      }
      seen.add(item.variantId);
    }
  });

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderCustomerInput = z.infer<typeof orderCustomerInputSchema>;
export type OrderShippingAddressInput = z.infer<typeof orderShippingAddressInputSchema>;

export const orderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderItemPublicSchema = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().nonnegative(),
  originalPriceCents: z.number().int().nonnegative().optional().nullable(),
  discountCents: z.number().int().nonnegative().default(0),
  offerId: z.string().uuid().optional().nullable(),
  bundleId: z.string().uuid().optional().nullable(),
  bundleName: z.string().optional().nullable(),
  productName: z.string().optional(),
  variantName: z.string().optional(),
}).strict();

export const orderPublicSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  status: orderStatusSchema,
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string().nullable().optional(),
  governorate: z.string(),
  cityArea: z.string(),
  detailedAddress: z.string(),
  landmark: z.string().nullable().optional(),
  subtotalCents: z.number().int().nonnegative(),
  shippingFeeCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative(),
  offerDiscountCents: z.number().int().nonnegative().default(0),
  bundleDiscountCents: z.number().int().nonnegative().default(0),
  couponDiscountCents: z.number().int().nonnegative().default(0),
  totalCents: z.number().int().nonnegative(),
  items: z.array(orderItemPublicSchema),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  trackingNumber: z.string().nullable().optional(),
  courierName: z.string().nullable().optional(),
  couponCode: z.string().nullable().optional(),
}).strict();

export const discountTypeSchema = z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]);
export type DiscountType = z.infer<typeof discountTypeSchema>;

export const validateCouponSchema = z.object({
  code: z.string().trim().min(2).max(30),
  subtotalCents: z.number().int().nonnegative(),
  shippingFeeCents: z.number().int().nonnegative().default(0),
}).strict();

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

export const adminCreateCouponSchema = z.object({
  code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/, "كود الخصم يجب أن يحتوي على أحرف وأرقام فقط"),
  description: z.string().trim().max(255).optional().nullable(),
  discountType: discountTypeSchema,
  discountValue: z.number().int().positive("قيمة الخصم يجب أن تكون رقمًا موجبًا"),
  minSubtotalCents: z.number().int().nonnegative().default(0),
  maxDiscountCents: z.number().int().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
}).strict();
export type AdminCreateCouponInput = z.infer<typeof adminCreateCouponSchema>;

export const adminUpdateCouponSchema = z.object({
  description: z.string().trim().max(255).optional().nullable(),
  discountType: discountTypeSchema.optional(),
  discountValue: z.number().int().positive().optional(),
  minSubtotalCents: z.number().int().nonnegative().optional(),
  maxDiscountCents: z.number().int().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
}).strict();
export type AdminUpdateCouponInput = z.infer<typeof adminUpdateCouponSchema>;

export const couponPublicSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  description: z.string().nullable(),
  discountType: discountTypeSchema,
  discountValue: z.number().int(),
  minSubtotalCents: z.number().int(),
  maxDiscountCents: z.number().int().nullable(),
  usageLimit: z.number().int().nullable(),
  usageCount: z.number().int(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict();
export type CouponPublic = z.infer<typeof couponPublicSchema>;

export const couponListResponseSchema = z.object({
  data: z.array(couponPublicSchema),
});
export type CouponListResponse = z.infer<typeof couponListResponseSchema>;

export const idParamSchema = z.object({
  id: z.string().uuid(),
}).strict();
export type IdParam = z.infer<typeof idParamSchema>;

export const productIdParamSchema = z.object({
  productId: z.string().uuid(),
}).strict();
export type ProductIdParam = z.infer<typeof productIdParamSchema>;

export const orderParamsSchema = z.object({
  id: z.string().uuid(),
}).strict();

export const adminOrderListQuerySchema = paginationSchema.extend({
  status: orderStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
});

export const adminUpdateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  courierName: z.string().trim().max(100).optional().nullable(),
  trackingNumber: z.string().trim().max(100).optional().nullable(),
}).strict();

export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;
export type AdminUpdateOrderStatusInput = z.infer<typeof adminUpdateOrderStatusSchema>;

export type OrderPublic = z.infer<typeof orderPublicSchema>;

export const wishlistItemInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
}).strict();

export const wishlistSyncInputSchema = z.object({
  items: z.array(wishlistItemInputSchema).max(100),
}).strict();

export const wishlistItemPublicSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime().or(z.date()),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    imageUrl: z.string().nullable().optional(),
    minPriceCents: z.number().int().nonnegative(),
  }),
  variant: z.object({
    id: z.string().uuid(),
    sku: z.string(),
    name: z.string(),
    priceCents: z.number().int().nonnegative(),
    stockQuantity: z.number().int().nonnegative(),
  }).nullable().optional(),
}).strict();

export type WishlistItemInput = z.infer<typeof wishlistItemInputSchema>;
export type WishlistSyncInput = z.infer<typeof wishlistSyncInputSchema>;
export type WishlistItemPublic = z.infer<typeof wishlistItemPublicSchema>;

export const reviewStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
}).strict();
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const reviewPublicSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  isVerifiedPurchase: z.boolean(),
  status: reviewStatusSchema.optional(),
  createdAt: z.string(),
}).strict();
export type ReviewPublic = z.infer<typeof reviewPublicSchema>;

export const productReviewsResponseSchema = z.object({
  items: z.array(reviewPublicSchema),
  stats: z.object({
    averageRating: z.number(),
    totalReviews: z.number(),
    ratingDistribution: z.record(z.string(), z.number()),
  }),
});
export type ProductReviewsResponse = z.infer<typeof productReviewsResponseSchema>;

// ================= Product Offers Schemas =================

export const offerDiscountTypeSchema = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]);
export type OfferDiscountType = z.infer<typeof offerDiscountTypeSchema>;

export const adminCreateProductOfferSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  discountType: offerDiscountTypeSchema,
  discountValue: z.number().int().positive("قيمة الخصم يجب أن تكون أكبر من 0"),
  maxDiscountCents: z.number().int().positive().optional().nullable(),
  isFreeShipping: z.boolean().default(false),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string().uuid()).min(1, "يجب اختيار منتج واحد على الأقل"),
}).strict();
export type AdminCreateProductOfferInput = z.input<typeof adminCreateProductOfferSchema>;

export const adminUpdateProductOfferSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  discountType: offerDiscountTypeSchema.optional(),
  discountValue: z.number().int().positive().optional(),
  maxDiscountCents: z.number().int().positive().optional().nullable(),
  isFreeShipping: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.string().uuid()).min(1).optional(),
}).strict();
export type AdminUpdateProductOfferInput = z.infer<typeof adminUpdateProductOfferSchema>;

export const productOfferPublicSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  discountType: offerDiscountTypeSchema,
  discountValue: z.number().int(),
  maxDiscountCents: z.number().int().nullable().optional(),
  isFreeShipping: z.boolean(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean(),
  productIds: z.array(z.string().uuid()),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict();
export type ProductOfferPublic = z.infer<typeof productOfferPublicSchema>;

export const productOfferListResponseSchema = z.object({
  data: z.array(productOfferPublicSchema),
});
export type ProductOfferListResponse = z.infer<typeof productOfferListResponseSchema>;

// ================= Bundles Schemas =================

export const adminBundleItemInputSchema = z.object({
  productId: z.string().uuid(),
  defaultVariantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).max(10).default(1),
}).strict();
export type AdminBundleItemInput = z.infer<typeof adminBundleItemInputSchema>;

export const adminCreateBundleSchema = z.object({
  internalName: z.string().trim().min(2).max(120),
  publicTitle: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  fixedPriceCents: z.number().int().positive().optional().nullable(),
  discountCents: z.number().int().positive().optional().nullable(),
  isFreeShipping: z.boolean().default(false),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  items: z.array(adminBundleItemInputSchema).min(1, "يجب إضافة منتج واحد على الأقل للباقة"),
}).strict().superRefine((val, ctx) => {
  if (val.fixedPriceCents === null && val.discountCents === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "يجب تحديد سعر ثابت للباقة أو قيمة الخصم",
      path: ["fixedPriceCents"],
    });
  }
  if (val.fixedPriceCents === undefined && val.discountCents === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "يجب تحديد سعر ثابت للباقة أو قيمة الخصم",
      path: ["fixedPriceCents"],
    });
  }
});
export type AdminCreateBundleInput = z.input<typeof adminCreateBundleSchema>;

export const adminUpdateBundleSchema = z.object({
  internalName: z.string().trim().min(2).max(120).optional(),
  publicTitle: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  fixedPriceCents: z.number().int().positive().optional().nullable(),
  discountCents: z.number().int().positive().optional().nullable(),
  isFreeShipping: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  items: z.array(adminBundleItemInputSchema).min(1).optional(),
}).strict();
export type AdminUpdateBundleInput = z.infer<typeof adminUpdateBundleSchema>;

export const bundleComponentProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  imageUrl: z.string().nullable().optional(),
  variants: z.array(z.object({
    id: z.string().uuid(),
    sku: z.string().optional(),
    name: z.string(),
    priceCents: z.number().int(),
    stockQuantity: z.number().int().nonnegative(),
    size: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
  })),
});

export const bundleItemPublicSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  defaultVariantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1),
  product: bundleComponentProductSchema.optional(),
}).strict();
export type BundleItemPublic = z.infer<typeof bundleItemPublicSchema>;

export const bundlePublicSchema = z.object({
  id: z.string().uuid(),
  internalName: z.string(),
  publicTitle: z.string(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  fixedPriceCents: z.number().int().nullable().optional(),
  discountCents: z.number().int().nullable().optional(),
  isFreeShipping: z.boolean(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean(),
  displayOrder: z.number().int(),
  items: z.array(bundleItemPublicSchema),
  availableStock: z.number().int().nonnegative().optional(),
  totalOriginalPriceCents: z.number().int().nonnegative().optional(),
  finalPriceCents: z.number().int().nonnegative().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict();
export type BundlePublic = z.infer<typeof bundlePublicSchema>;

export const bundleListResponseSchema = z.object({
  data: z.array(bundlePublicSchema),
});
export type BundleListResponse = z.infer<typeof bundleListResponseSchema>;
