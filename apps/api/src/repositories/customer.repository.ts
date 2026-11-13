import type { PrismaClient } from "@prisma/client";
import type { CustomerAddressInput, CustomerRegistrationInput } from "@store/shared";

export type CustomerProfile = {
  id: string;
  fullName: string;
  phoneE164: string | null;
  email: string | null;
};

export class CustomerRepository {
  public constructor(private readonly db: PrismaClient) {}

  public create(input: Pick<CustomerRegistrationInput, "fullName" | "phone"> & { passwordHash: string }) {
    return this.db.customer.create({
      data: {
        fullName: input.fullName,
        phoneE164: input.phone,
        passwordHash: input.passwordHash,
      },
      select: { id: true, fullName: true, phoneE164: true, email: true },
    });
  }

  public createFromGoogle(input: { fullName: string; email: string; googleId: string }) {
    return this.db.customer.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        googleId: input.googleId,
      },
      select: { id: true, fullName: true, phoneE164: true, email: true },
    });
  }

  public findByPhone(phoneE164: string) {
    return this.db.customer.findUnique({
      where: { phoneE164 },
      select: { id: true, fullName: true, phoneE164: true, email: true, passwordHash: true },
    });
  }

  public findByGoogleId(googleId: string): Promise<CustomerProfile | null> {
    return this.db.customer.findUnique({
      where: { googleId },
      select: { id: true, fullName: true, phoneE164: true, email: true },
    });
  }

  public findByEmail(email: string): Promise<CustomerProfile | null> {
    return this.db.customer.findUnique({
      where: { email },
      select: { id: true, fullName: true, phoneE164: true, email: true },
    });
  }

  public linkGoogleId(id: string, googleId: string): Promise<CustomerProfile> {
    return this.db.customer.update({
      where: { id },
      data: { googleId },
      select: { id: true, fullName: true, phoneE164: true, email: true },
    });
  }

  public findProfileById(id: string): Promise<CustomerProfile | null> {
    return this.db.customer.findUnique({
      where: { id },
      select: { id: true, fullName: true, phoneE164: true, email: true },
    });
  }

  public updateProfile(id: string, fullName: string): Promise<CustomerProfile> {
    return this.db.customer.update({
      where: { id },
      data: { fullName },
      select: { id: true, fullName: true, phoneE164: true, email: true },
    });
  }

  public listAddresses(customerId: string) {
    return this.db.customerAddress.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        governorate: true,
        cityArea: true,
        detailedAddress: true,
        landmark: true,
      },
    });
  }

  public createAddress(customerId: string, input: CustomerAddressInput) {
    return this.db.customerAddress.create({
      data: {
        ...input,
        landmark: input.landmark || null,
        customerId,
      },
      select: {
        id: true,
        label: true,
        governorate: true,
        cityArea: true,
        detailedAddress: true,
        landmark: true,
      },
    });
  }

  public async updateAddress(customerId: string, id: string, input: CustomerAddressInput) {
    const updated = await this.db.customerAddress.updateMany({
      where: { id, customerId },
      data: { ...input, landmark: input.landmark || null },
    });
    if (updated.count !== 1) return null;
    return this.db.customerAddress.findUnique({
      where: { id },
      select: {
        id: true,
        label: true,
        governorate: true,
        cityArea: true,
        detailedAddress: true,
        landmark: true,
      },
    });
  }

  public deleteAddress(customerId: string, id: string) {
    return this.db.customerAddress.deleteMany({ where: { id, customerId } });
  }
}
