import type { WishlistItemInput, WishlistItemPublic } from "@store/shared";
import type { WishlistRepository } from "../repositories/wishlist.repository.js";

export class WishlistService {
  public constructor(private readonly repo: WishlistRepository) {}

  public async getWishlist(customerId: string): Promise<{ data: WishlistItemPublic[] }> {
    const data = await this.repo.listByCustomerId(customerId);
    return { data };
  }

  public async addToWishlist(
    customerId: string,
    input: WishlistItemInput,
  ): Promise<{ data: WishlistItemPublic[] }> {
    await this.repo.addItem(customerId, input.productId, input.variantId);
    return this.getWishlist(customerId);
  }

  public async removeFromWishlist(
    customerId: string,
    idOrProductId: string,
  ): Promise<{ data: WishlistItemPublic[] }> {
    await this.repo.removeItem(customerId, idOrProductId);
    return this.getWishlist(customerId);
  }

  public async syncWishlist(
    customerId: string,
    items: WishlistItemInput[],
  ): Promise<{ data: WishlistItemPublic[] }> {
    const data = await this.repo.syncItems(customerId, items);
    return { data };
  }
}
