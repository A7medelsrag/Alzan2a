import argon2 from "argon2";
import type { PrismaClient } from "@prisma/client";
import { customerAddressInputSchema, customerRegistrationSchema } from "@store/shared";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../errors.js";
import { CustomerRepository } from "../repositories/customer.repository.js";
import { CustomerService, verifyGoogleToken } from "./customer.service.js";
import type { CustomerSessionStore } from "./customer-session.store.js";

function createSessionStore(): CustomerSessionStore {
  return {
    create: vi.fn(),
    get: vi.fn(),
    revoke: vi.fn(),
    recordFailedLogin: vi.fn().mockResolvedValue(1),
    clearFailedLogins: vi.fn(),
  };
}

describe("customer account service", () => {
  it("hashes passwords and creates an opaque server-side session", async () => {
    const storedCustomer = {
      id: "11111111-1111-4111-8111-111111111111",
      fullName: "منى أحمد",
      phoneE164: "+201012345678",
    };
    const createCustomer = vi.fn().mockImplementation(({ data }: {
      data: { fullName: string; phoneE164: string; passwordHash: string };
    }) => ({
      ...storedCustomer,
      fullName: data.fullName,
      phoneE164: data.phoneE164,
      passwordHash: data.passwordHash,
    }));
    const database = { customer: { create: createCustomer } } as unknown as PrismaClient;
    const sessions = createSessionStore();
    const service = new CustomerService(new CustomerRepository(database), sessions);
    const input = customerRegistrationSchema.parse({
      fullName: storedCustomer.fullName,
      phone: "01012345678",
      password: "A private phrase 2026",
      passwordConfirmation: "A private phrase 2026",
    });

    const result = await service.register(input);

    expect(result.data).toEqual({
      id: storedCustomer.id,
      fullName: storedCustomer.fullName,
      phone: "01012345678",
      email: null,
    });
    expect(result).not.toHaveProperty("password");
    const createCall = createCustomer.mock.calls[0];
    if (!createCall) throw new Error("Customer creation was not called");
    const createData = createCall[0].data;
    expect(createData.passwordHash).not.toBe(input.password);
    await expect(argon2.verify(createData.passwordHash, input.password)).resolves.toBe(true);
    expect(sessions.create).toHaveBeenCalledWith(
      result.sessionToken,
      expect.objectContaining({ customerId: storedCustomer.id, csrfToken: result.csrfToken }),
    );
    expect(result.sessionToken).toHaveLength(43);
  });

  it("does not reveal whether a phone exists on invalid login", async () => {
    const database = { customer: { findUnique: vi.fn().mockResolvedValue(null) } } as unknown as PrismaClient;
    const sessions = createSessionStore();
    const service = new CustomerService(new CustomerRepository(database), sessions);
    const input = {
      phone: "+201012345678",
      password: "A private phrase 2026",
    };

    await expect(service.login(input)).rejects.toMatchObject({
      code: "CUSTOMER_CREDENTIALS_INVALID",
      statusCode: 401,
    });
    expect(sessions.recordFailedLogin).toHaveBeenCalledWith(expect.any(String));
  });

  it("scopes address updates to the authenticated customer", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const database = { customerAddress: { updateMany } } as unknown as PrismaClient;
    const service = new CustomerService(new CustomerRepository(database), createSessionStore());
    const input = customerAddressInputSchema.parse({
      label: "المنزل",
      governorate: "القاهرة",
      cityArea: "مدينة نصر",
      detailedAddress: "شارع مثال، مبنى ١",
    });

    await expect(service.updateAddress(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      input,
    )).rejects.toBeInstanceOf(AppError);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "22222222-2222-4222-8222-222222222222",
        customerId: "11111111-1111-4111-8111-111111111111",
      },
    }));
  });

  it("creates a new customer and session upon valid Google login", async () => {
    const newCustomer = {
      id: "33333333-3333-4333-8333-333333333333",
      fullName: "سارة محمد",
      email: "sara@example.com",
      phoneE164: null,
      googleId: "google-sub-12345",
    };
    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue(newCustomer);
    const database = { customer: { findUnique, create } } as unknown as PrismaClient;
    const sessions = createSessionStore();
    const service = new CustomerService(new CustomerRepository(database), sessions);

    const mockVerifier = vi.fn().mockResolvedValue({
      googleId: "google-sub-12345",
      email: "sara@example.com",
      fullName: "سارة محمد",
    });

    const result = await service.loginWithGoogle("valid-token", "client-id", undefined, mockVerifier);

    expect(result.data).toEqual({
      id: newCustomer.id,
      fullName: newCustomer.fullName,
      email: "sara@example.com",
      phone: null,
    });
    expect(sessions.create).toHaveBeenCalledWith(result.sessionToken, expect.objectContaining({ customerId: newCustomer.id }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        fullName: "سارة محمد",
        email: "sara@example.com",
        googleId: "google-sub-12345",
      }),
    }));
  });

  it("links googleId to existing customer if email matches", async () => {
    const existingCustomer = {
      id: "44444444-4444-4444-8444-444444444444",
      fullName: "نور علي",
      email: "nour@example.com",
      phoneE164: "+201112345678",
      googleId: null,
    };
    const updatedCustomer = {
      ...existingCustomer,
      googleId: "google-sub-99999",
    };
    const findUnique = vi.fn().mockImplementation(({ where }: { where: { googleId?: string; email?: string } }) => {
      if (where.googleId) return Promise.resolve(null);
      if (where.email === "nour@example.com") return Promise.resolve(existingCustomer);
      return Promise.resolve(null);
    });
    const update = vi.fn().mockResolvedValue(updatedCustomer);
    const database = { customer: { findUnique, update } } as unknown as PrismaClient;
    const sessions = createSessionStore();
    const service = new CustomerService(new CustomerRepository(database), sessions);

    const mockVerifier = vi.fn().mockResolvedValue({
      googleId: "google-sub-99999",
      email: "nour@example.com",
      fullName: "نور علي",
    });

    const result = await service.loginWithGoogle("valid-token", "client-id", undefined, mockVerifier);

    expect(result.data.email).toBe("nour@example.com");
    expect(result.data.phone).toBe("01112345678");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: existingCustomer.id },
      data: { googleId: "google-sub-99999" },
    }));
  });

  it("verifies google token and validates payload & email_verified", async () => {
    const mockOAuthClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          sub: "google-sub-123",
          email: "TEST@Example.com",
          name: "Test User",
          email_verified: true,
        }),
      }),
    };

    const payload = await verifyGoogleToken("token", "client-id", mockOAuthClient as never);
    expect(payload).toEqual({
      googleId: "google-sub-123",
      email: "test@example.com",
      fullName: "Test User",
    });

    // Unverified email
    const unverifiedClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          sub: "google-sub-123",
          email: "test@example.com",
          email_verified: false,
        }),
      }),
    };
    await expect(verifyGoogleToken("token", "client-id", unverifiedClient as never))
      .rejects.toMatchObject({ code: "GOOGLE_EMAIL_UNVERIFIED", statusCode: 403 });

    // Invalid token rejected by Google
    const failingClient = {
      verifyIdToken: vi.fn().mockRejectedValue(new Error("Invalid token")),
    };
    await expect(verifyGoogleToken("bad-token", "client-id", failingClient as never))
      .rejects.toMatchObject({ code: "GOOGLE_AUTH_FAILED", statusCode: 401 });
  });
});
