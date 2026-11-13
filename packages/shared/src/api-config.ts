import { z } from "zod";

const environmentSchema = z.enum(["development", "test", "production"]);

const originSchema = z.string().url().refine(
  (value) => new URL(value).origin === value.replace(/\/$/, ""),
  "An allowed origin must not include a path",
);

const publicAssetBaseUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
}, "MEDIA_PUBLIC_ASSET_BASE_URL must be an HTTPS URL without credentials, query, or fragment");

const storageEndpointSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
}, "MEDIA_S3_ENDPOINT must be an HTTP(S) URL without credentials");

export const apiConfigSchema = z.object({
  NODE_ENV: environmentSchema.default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  ADMIN_MFA_ENCRYPTION_KEY: z.string().optional(),
  ORDER_RECEIPT_SECRET: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  GOOGLE_CLIENT_ID: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  API_BODY_LIMIT_BYTES: z.coerce.number().int().min(1_024).max(10_485_760).default(1_048_576),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10_000).default(300),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),
  TRUST_PROXY: z.string().optional(),
  MEDIA_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  MEDIA_LOCAL_DIRECTORY: z.string().min(1).default(".media"),
  MEDIA_PUBLIC_ASSET_BASE_URL: publicAssetBaseUrlSchema.optional(),
  MEDIA_S3_ENDPOINT: storageEndpointSchema.optional(),
  MEDIA_S3_REGION: z.string().regex(/^[a-z0-9-]+$/i).optional(),
  MEDIA_S3_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/).optional(),
  MEDIA_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  MEDIA_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  MEDIA_S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
}).passthrough();

export type ApiConfig = {
  environment: z.infer<typeof environmentSchema>;
  host: string;
  port: number;
  databaseUrl: string;
  redisUrl?: string;
  adminMfaEncryptionKey?: string;
  orderReceiptSecret?: string;
  googleClientId?: string;
  allowedOrigins: string[];
  logLevel: z.infer<typeof apiConfigSchema>["LOG_LEVEL"];
  bodyLimitBytes: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  trustProxy?: boolean | number | string | string[];
  media: {
    driver: "local" | "s3";
    localDirectory: string;
    publicAssetBaseUrl: string;
    s3?: {
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    };
  };
};

export function parseApiConfig(environment: NodeJS.ProcessEnv): ApiConfig {
  const parsed = apiConfigSchema.parse(environment);
  const defaultDevelopmentOrigins = "http://localhost:5000,http://127.0.0.1:5000";
  const configuredOrigins = parsed.CORS_ALLOWED_ORIGINS?.trim()
    ? parsed.CORS_ALLOWED_ORIGINS
    : parsed.NODE_ENV === "development"
      ? defaultDevelopmentOrigins
      : undefined;
  const allowedOrigins = parseOrigins(configuredOrigins);
  const publicAssetBaseUrl = parsed.MEDIA_PUBLIC_ASSET_BASE_URL ?? "https://localhost:4000/api/v1/media";
  if (parsed.NODE_ENV === "production" && allowedOrigins.length === 0) {
    throw new Error("CORS_ALLOWED_ORIGINS is required in production");
  }
  if (parsed.NODE_ENV === "production" && !parsed.REDIS_URL) {
    throw new Error("REDIS_URL is required in production for server-side sessions");
  }
  if (parsed.NODE_ENV === "production" && !parsed.ADMIN_MFA_ENCRYPTION_KEY) {
    throw new Error("ADMIN_MFA_ENCRYPTION_KEY is required in production");
  }
  if (parsed.ADMIN_MFA_ENCRYPTION_KEY && !isValidEncryptionKey(parsed.ADMIN_MFA_ENCRYPTION_KEY)) {
    throw new Error("ADMIN_MFA_ENCRYPTION_KEY must be a 32-byte base64 or hex key");
  }
  if (parsed.NODE_ENV === "production" && parsed.MEDIA_STORAGE_DRIVER !== "s3") {
    throw new Error("MEDIA_STORAGE_DRIVER must be s3 in production");
  }
  if (parsed.MEDIA_STORAGE_DRIVER === "s3" && !parsed.MEDIA_PUBLIC_ASSET_BASE_URL) {
    throw new Error("MEDIA_PUBLIC_ASSET_BASE_URL is required for S3 storage");
  }
  if (parsed.NODE_ENV === "production" && parsed.MEDIA_S3_ENDPOINT && !parsed.MEDIA_S3_ENDPOINT.startsWith("https://")) {
    throw new Error("MEDIA_S3_ENDPOINT must use HTTPS in production");
  }

  const s3 = parsed.MEDIA_STORAGE_DRIVER === "s3" ? requireS3Config(parsed) : undefined;

  return {
    environment: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    redisUrl: parsed.REDIS_URL,
    adminMfaEncryptionKey: parsed.ADMIN_MFA_ENCRYPTION_KEY,
    orderReceiptSecret: parsed.ORDER_RECEIPT_SECRET,
    googleClientId: parsed.GOOGLE_CLIENT_ID,
    allowedOrigins,
    logLevel: parsed.LOG_LEVEL,
    bodyLimitBytes: parsed.API_BODY_LIMIT_BYTES,
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
    trustProxy: parseTrustProxy(parsed.TRUST_PROXY),
    media: {
      driver: parsed.MEDIA_STORAGE_DRIVER,
      localDirectory: parsed.MEDIA_LOCAL_DIRECTORY,
      publicAssetBaseUrl,
      ...(s3 ? { s3 } : {}),
    },
  };
}

function requireS3Config(
  parsed: z.infer<typeof apiConfigSchema>,
): NonNullable<ApiConfig["media"]["s3"]> {
  const { MEDIA_S3_REGION, MEDIA_S3_BUCKET, MEDIA_S3_ACCESS_KEY_ID, MEDIA_S3_SECRET_ACCESS_KEY } = parsed;
  if (!MEDIA_S3_REGION || !MEDIA_S3_BUCKET || !MEDIA_S3_ACCESS_KEY_ID || !MEDIA_S3_SECRET_ACCESS_KEY) {
    throw new Error("MEDIA_S3_REGION, MEDIA_S3_BUCKET, MEDIA_S3_ACCESS_KEY_ID, and MEDIA_S3_SECRET_ACCESS_KEY are required for S3 storage");
  }
  return {
    endpoint: parsed.MEDIA_S3_ENDPOINT,
    region: MEDIA_S3_REGION,
    bucket: MEDIA_S3_BUCKET,
    accessKeyId: MEDIA_S3_ACCESS_KEY_ID,
    secretAccessKey: MEDIA_S3_SECRET_ACCESS_KEY,
    forcePathStyle: parsed.MEDIA_S3_FORCE_PATH_STYLE,
  };
}

function isValidEncryptionKey(value: string): boolean {
  if (/^[0-9a-f]{64}$/i.test(value)) return true;
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) return false;
  const decoded = Buffer.from(value, "base64");
  return decoded.length === 32 && decoded.toString("base64") === value;
}

function parseOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((origin) => origin.trim()).filter(Boolean).map((origin) => originSchema.parse(origin)))];
}

function parseTrustProxy(value: string | undefined): boolean | number | string | string[] {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "false") return false;
  if (trimmed === "true") return true;
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length <= 1 ? (parts[0] ?? false) : parts;
}
