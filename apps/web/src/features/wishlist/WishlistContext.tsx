import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { WishlistItemPublic } from "@store/shared";
import { useCustomerSession } from "../customer/CustomerSession";
import {
  addToServerWishlist,
  fetchServerWishlist,
  removeFromServerWishlist,
  syncServerWishlist,
} from "./api/wishlist";

export const GUEST_WISHLIST_STORAGE_KEY = "zan2a_guest_wishlist";

export interface WishlistProductSnippet {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
  priceCents: number;
}

export interface UnifiedWishlistItem {
  id: string; // generated client-side for guests, or DB id for customer
  productId: string;
  variantId?: string | null;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
  priceCents: number;
}

export function addLocalWishlistItem(
  list: UnifiedWishlistItem[],
  item: WishlistProductSnippet,
  variantId?: string | null,
): UnifiedWishlistItem[] {
  if (list.some((i) => i.productId === item.id)) {
    return list;
  }
  return [
    {
      id: `guest_${item.id}`,
      productId: item.id,
      variantId: variantId ?? null,
      name: item.name,
      slug: item.slug,
      description: item.description,
      imageUrl: item.imageUrl,
      priceCents: item.priceCents,
    },
    ...list,
  ];
}

export function removeLocalWishlistItem(
  list: UnifiedWishlistItem[],
  productIdOrId: string,
): UnifiedWishlistItem[] {
  return list.filter((i) => i.productId !== productIdOrId && i.id !== productIdOrId);
}

export function isItemInWishlist(
  list: UnifiedWishlistItem[],
  productId: string,
): boolean {
  return list.some((i) => i.productId === productId);
}

export function loadSavedGuestWishlist(): UnifiedWishlistItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UnifiedWishlistItem[];
  } catch {
    return [];
  }
}

export function saveGuestWishlist(items: UnifiedWishlistItem[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Graceful fallback
  }
}

interface WishlistContextType {
  items: UnifiedWishlistItem[];
  count: number;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: WishlistProductSnippet, variantId?: string | null) => Promise<void>;
  removeItem: (productIdOrId: string) => Promise<void>;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

function mapServerItemToUnified(serverItem: WishlistItemPublic): UnifiedWishlistItem {
  return {
    id: serverItem.id,
    productId: serverItem.productId,
    variantId: serverItem.variantId,
    name: serverItem.product.name,
    slug: serverItem.product.slug,
    description: serverItem.product.description,
    imageUrl: serverItem.product.imageUrl,
    priceCents: serverItem.variant?.priceCents ?? serverItem.product.minPriceCents,
  };
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { customer, csrfToken, status } = useCustomerSession();
  const [items, setItems] = useState<UnifiedWishlistItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load wishlist based on authentication status
  useEffect(() => {
    let active = true;

    if (status === "authenticated" && customer && csrfToken) {
      // Check for local guest items to sync
      const guestItems = loadSavedGuestWishlist();
      if (guestItems.length > 0) {
        void syncServerWishlist(
          { items: guestItems.map((g) => ({ productId: g.productId, variantId: g.variantId })) },
          csrfToken,
        )
          .then((res) => {
            if (!active) return;
            localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
            setItems(res.data.map(mapServerItemToUnified));
          })
          .catch(() => {
            // fallback to fetch
            void fetchServerWishlist().then((res) => {
              if (active) setItems(res.data.map(mapServerItemToUnified));
            });
          });
      } else {
        void fetchServerWishlist().then((res) => {
          if (active) setItems(res.data.map(mapServerItemToUnified));
        });
      }
    } else if (status === "anonymous") {
      setItems(loadSavedGuestWishlist());
    }

    return () => {
      active = false;
    };
  }, [customer, csrfToken, status]);

  const isInWishlist = (productId: string): boolean => {
    return isItemInWishlist(items, productId);
  };

  const toggleWishlist = async (
    product: WishlistProductSnippet,
    variantId?: string | null,
  ): Promise<void> => {
    const exists = isInWishlist(product.id);

    if (status === "authenticated" && customer && csrfToken) {
      try {
        if (exists) {
          const res = await removeFromServerWishlist(product.id, csrfToken);
          setItems(res.data.map(mapServerItemToUnified));
        } else {
          const res = await addToServerWishlist(
            { productId: product.id, variantId: variantId ?? null },
            csrfToken,
          );
          setItems(res.data.map(mapServerItemToUnified));
        }
      } catch {
        // Fallback or ignore
      }
    } else {
      // Guest mode
      const nextItems = exists
        ? removeLocalWishlistItem(items, product.id)
        : addLocalWishlistItem(items, product, variantId);
      setItems(nextItems);
      saveGuestWishlist(nextItems);
    }
  };

  const removeItem = async (productIdOrId: string): Promise<void> => {
    if (status === "authenticated" && customer && csrfToken) {
      try {
        const res = await removeFromServerWishlist(productIdOrId, csrfToken);
        setItems(res.data.map(mapServerItemToUnified));
      } catch {
        // Fallback or ignore
      }
    } else {
      const nextItems = removeLocalWishlistItem(items, productIdOrId);
      setItems(nextItems);
      saveGuestWishlist(nextItems);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        count: items.length,
        isInWishlist,
        toggleWishlist,
        removeItem,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextType {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return ctx;
}
