import { Prisma } from "@prisma/client";
import argon2, { type HashOptions } from "argon2";
import { OAuth2Client } from "google-auth-library";
import { createHash, randomBytes } from "node:crypto";
import {
  displayEgyptianPhone,
  type CustomerAddressInput,
  type CustomerLoginInput,
  type CustomerRegistrationInput,
} from "@store/shared";
import { AppError } from "../errors.js";
import { CustomerRepository } from "../repositories/customer.repository.js";
import type { CustomerSessionStore } from "./customer-session.store.js";

const passwordHashOptions: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export type PublicCustomer = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
};

export type GoogleTokenPayload = {
  googleId: string;
  email: string;
  fullName: string;
};

export async function verifyGoogleToken(
  credential: string,
  googleClientId?: string,
  oauthClient = new OAuth2Client(googleClientId)
): Promise<GoogleTokenPayload> {
  let ticket;
  try {
    ticket = await oauthClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });
  } catch (error) {
    throw new AppError("GOOGLE_AUTH_FAILED", 401, error instanceof Error ? error.message : undefined);
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new AppError("GOOGLE_AUTH_FAILED", 401, "Missing payload fields");
  }

  if (payload.email_verified !== true) {
    throw new AppError("GOOGLE_EMAIL_UNVERIFIED", 403, "Google email is not verified");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    fullName: payload.name || payload.given_name || "Google User",
  };
}

export class CustomerService {
  private dummyPasswordHash?: Promise<string>;

  public constructor(
    private readonly customers: CustomerRepository,
    private readonly sessions?: CustomerSessionStore,
  ) {}

  public async register(input: CustomerRegistrationInput, previousToken?: string) {
    const sessions = this.requireSessionStore();
    const passwordHash = await argon2.hash(input.password, passwordHashOptions);
    let customer;
    try {
      customer = await this.customers.create({
        fullName: input.fullName,
        phone: input.phone,
        passwordHash,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("CUSTOMER_PHONE_ALREADY_REGISTERED", 409);
      }
      throw error;
    }

    const session = await this.createSession(customer.id);
    if (previousToken) await sessions.revoke(previousToken);
    return { data: this.toPublicCustomer(customer), csrfToken: session.csrfToken, sessionToken: session.token };
  }

  public async login(input: CustomerLoginInput, previousToken?: string) {
    const sessions = this.requireSessionStore();
    const accountKey = createHash("sha256").update(input.phone).digest("hex");
    const failures = await sessions.recordFailedLogin(accountKey);
    if (failures >= 5) await delay(Math.min(5_000, 250 * 2 ** Math.min(failures - 5, 5)));

    const customer = await this.customers.findByPhone(input.phone);
    const passwordHash = customer?.passwordHash ?? await this.getDummyPasswordHash();
    const passwordMatches = await argon2.verify(passwordHash, input.password);
    if (!customer || !passwordMatches) {
      throw new AppError("CUSTOMER_CREDENTIALS_INVALID", 401);
    }

    await sessions.clearFailedLogins(accountKey);
    const session = await this.createSession(customer.id);
    if (previousToken) await sessions.revoke(previousToken);
    return { data: this.toPublicCustomer(customer), csrfToken: session.csrfToken, sessionToken: session.token };
  }

  public async loginWithGoogle(
    credential: string,
    googleClientId?: string,
    previousToken?: string,
    tokenVerifier: (credential: string, clientId?: string) => Promise<GoogleTokenPayload> = verifyGoogleToken
  ) {
    const sessions = this.requireSessionStore();
    const { googleId, email, fullName } = await tokenVerifier(credential, googleClientId);

    let customer = await this.customers.findByGoogleId(googleId);
    if (!customer) {
      const existingEmailCustomer = await this.customers.findByEmail(email);
      customer = existingEmailCustomer
        ? await this.customers.linkGoogleId(existingEmailCustomer.id, googleId)
        : await this.customers.createFromGoogle({
            fullName,
            email,
            googleId,
          });
    }

    const session = await this.createSession(customer.id);
    if (previousToken) await sessions.revoke(previousToken);
    return {
      data: this.toPublicCustomer(customer),
      csrfToken: session.csrfToken,
      sessionToken: session.token,
    };
  }

  public async getSession(sessionToken: string | undefined) {
    if (!sessionToken) throw new AppError("CUSTOMER_UNAUTHENTICATED", 401);
    const sessions = this.requireSessionStore();
    const session = await sessions.get(sessionToken);
    if (!session) throw new AppError("CUSTOMER_UNAUTHENTICATED", 401);
    const customer = await this.customers.findProfileById(session.customerId);
    if (!customer) {
      await sessions.revoke(sessionToken);
      throw new AppError("CUSTOMER_UNAUTHENTICATED", 401);
    }
    return { data: this.toPublicCustomer(customer), csrfToken: session.csrfToken };
  }

  public async logout(sessionToken: string | undefined): Promise<void> {
    if (sessionToken) await this.requireSessionStore().revoke(sessionToken);
  }

  public async updateProfile(customerId: string, fullName: string): Promise<PublicCustomer> {
    return this.toPublicCustomer(await this.customers.updateProfile(customerId, fullName));
  }

  public async listAddresses(customerId: string) {
    return { data: await this.customers.listAddresses(customerId) };
  }

  public async createAddress(customerId: string, input: CustomerAddressInput) {
    return { data: await this.customers.createAddress(customerId, input) };
  }

  public async updateAddress(customerId: string, id: string, input: CustomerAddressInput) {
    const address = await this.customers.updateAddress(customerId, id, input);
    if (!address) throw new AppError("CUSTOMER_ADDRESS_NOT_FOUND", 404);
    return { data: address };
  }

  public async deleteAddress(customerId: string, id: string): Promise<void> {
    const deleted = await this.customers.deleteAddress(customerId, id);
    if (deleted.count !== 1) throw new AppError("CUSTOMER_ADDRESS_NOT_FOUND", 404);
  }

  private requireSessionStore(): CustomerSessionStore {
    if (!this.sessions) throw new AppError("SERVICE_UNAVAILABLE", 503);
    return this.sessions;
  }

  private getDummyPasswordHash(): Promise<string> {
    this.dummyPasswordHash ??= argon2.hash("invalid-customer-account-password", passwordHashOptions);
    return this.dummyPasswordHash;
  }

  private async createSession(customerId: string) {
    const token = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(32).toString("base64url");
    const session = { customerId, csrfToken, createdAt: Date.now() };
    await this.requireSessionStore().create(token, session);
    return { ...session, token };
  }

  private toPublicCustomer(customer: { id: string; fullName: string; phoneE164: string | null; email?: string | null }): PublicCustomer {
    return {
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phoneE164 ? displayEgyptianPhone(customer.phoneE164) : null,
      email: customer.email ?? null,
    };
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
