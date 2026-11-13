import type { BundlePublic, ProductOfferPublic } from "@store/shared";

export async function listStoreOffers(): Promise<{ data: ProductOfferPublic[] }> {
  const response = await fetch("/api/v1/store/offers", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load offers");
  }

  return response.json();
}

export async function listStoreBundles(): Promise<{ data: BundlePublic[] }> {
  const response = await fetch("/api/v1/store/bundles", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load bundles");
  }

  return response.json();
}

export async function getStoreBundle(id: string): Promise<{ data: BundlePublic }> {
  const response = await fetch(`/api/v1/store/bundles/${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load bundle details");
  }

  return response.json();
}
