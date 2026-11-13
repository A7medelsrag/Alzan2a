import { Prisma } from "@prisma/client";
import type { HomepageBannerInput, HomepageSectionInput } from "@store/shared";
import { AppError } from "../errors.js";
import { HomepageRepository } from "../repositories/homepage.repository.js";

export class HomepageService {
  public constructor(private readonly homepage: HomepageRepository) {}

  public listPublished() {
    return this.run(() => this.homepage.listPublished());
  }

  public listForAdmin() {
    return this.run(() => this.homepage.listForAdmin());
  }

  public saveSection(input: HomepageSectionInput, actorId: string, id?: string) {
    return this.run(() => this.homepage.saveSection(input, actorId, id));
  }

  public deleteSection(id: string, actorId: string) {
    return this.run(() => this.homepage.deleteSection(id, actorId));
  }

  public reorderSections(ids: string[], actorId: string) {
    return this.run(() => this.homepage.reorderSections(ids, actorId));
  }

  public saveBanner(input: HomepageBannerInput, actorId: string, id?: string) {
    return this.run(() => this.homepage.saveBanner(input, actorId, id));
  }

  public deleteBanner(id: string, actorId: string) {
    return this.run(() => this.homepage.deleteBanner(id, actorId));
  }

  public updateProductImage(id: string, imageUrl: string | null, actorId: string) {
    return this.run(() => this.homepage.updateProductImage(id, imageUrl, actorId));
  }

  public updateCategoryImages(
    id: string,
    imageUrl: string | null,
    bannerImageUrl: string | null,
    actorId: string,
  ) {
    return this.run(() => this.homepage.updateCategoryImages(id, imageUrl, bannerImageUrl, actorId));
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2021" || error.code === "P2022")) {
        throw new AppError("HOMEPAGE_SETUP_REQUIRED", 503);
      }
      throw error;
    }
  }
}
