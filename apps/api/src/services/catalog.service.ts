import { AppError } from "../errors.js";
import { CatalogRepository } from "../repositories/catalog.repository.js";

export class CatalogService {
  public constructor(private readonly catalog: CatalogRepository) {}

  public async list(input: { page: number; pageSize: number; category?: string; search?: string }) {
    const [total, products] = await this.catalog.listPublished(input);
    return { data: products, page: input.page, pageSize: input.pageSize, total };
  }

  public async getBySlug(slug: string) {
    const product = await this.catalog.findPublishedBySlug(slug);
    if (!product) throw new AppError("PRODUCT_NOT_FOUND", 404);
    return { data: product };
  }

  public async listCategories() {
    const categories = await this.catalog.listCategories();
    return { data: categories };
  }
}
