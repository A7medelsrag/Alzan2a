import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string | null;
};

export type CartBundle = {
  bundleId: string;
  bundleTitle: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string | null;
  selectedVariants: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
  }>;
};

export function addItemToCart(
  current: CartItem[],
  item: Omit<CartItem, "quantity">,
  quantity = 1,
): CartItem[] {
  if (quantity <= 0) return current;
  const existingIndex = current.findIndex((i) => i.variantId === item.variantId);
  if (existingIndex >= 0) {
    const next = [...current];
    const existing = next[existingIndex];
    if (existing) {
      const newQty = Math.min(20, existing.quantity + quantity);
      next[existingIndex] = { ...existing, quantity: newQty };
    }
    return next;
  }
  return [...current, { ...item, quantity: Math.min(20, quantity) }];
}

export function removeItemFromCart(current: CartItem[], variantId: string): CartItem[] {
  return current.filter((item) => item.variantId !== variantId);
}

export function updateItemQuantity(
  current: CartItem[],
  variantId: string,
  quantity: number,
): CartItem[] {
  if (quantity <= 0) return removeItemFromCart(current, variantId);
  const safeQty = Math.min(20, Math.max(1, Math.floor(quantity)));
  return current.map((item) =>
    item.variantId === variantId ? { ...item, quantity: safeQty } : item,
  );
}

export function addBundleToCart(
  current: CartBundle[],
  bundle: Omit<CartBundle, "quantity">,
  quantity = 1,
): CartBundle[] {
  if (quantity <= 0) return current;
  const existingIndex = current.findIndex((b) => b.bundleId === bundle.bundleId);
  if (existingIndex >= 0) {
    const next = [...current];
    const existing = next[existingIndex];
    if (existing) {
      const newQty = Math.min(20, existing.quantity + quantity);
      next[existingIndex] = { ...existing, quantity: newQty, selectedVariants: bundle.selectedVariants };
    }
    return next;
  }
  return [...current, { ...bundle, quantity: Math.min(20, quantity) }];
}

export function removeBundleFromCart(current: CartBundle[], bundleId: string): CartBundle[] {
  return current.filter((b) => b.bundleId !== bundleId);
}

export function updateBundleQuantity(
  current: CartBundle[],
  bundleId: string,
  quantity: number,
): CartBundle[] {
  if (quantity <= 0) return removeBundleFromCart(current, bundleId);
  const safeQty = Math.min(20, Math.max(1, Math.floor(quantity)));
  return current.map((b) => (b.bundleId === bundleId ? { ...b, quantity: safeQty } : b));
}

export function computeCartTotals(
  items: CartItem[],
  bundles: CartBundle[] = [],
): {
  itemCount: number;
  subtotalCents: number;
} {
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const bundlesCount = bundles.reduce((sum, b) => sum + b.quantity, 0);
  const itemsSubtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const bundlesSubtotal = bundles.reduce((sum, b) => sum + b.priceCents * b.quantity, 0);

  return {
    itemCount: itemsCount + bundlesCount,
    subtotalCents: itemsSubtotal + bundlesSubtotal,
  };
}

type CartContextValue = {
  items: CartItem[];
  bundles: CartBundle[];
  itemCount: number;
  subtotalCents: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  addBundle: (bundle: Omit<CartBundle, "quantity">, quantity?: number) => void;
  removeBundle: (bundleId: string) => void;
  updateBundleQuantity: (bundleId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "zan2a_cart_v1";
const BUNDLE_STORAGE_KEY = "zan2a_bundles_v1";

export function loadSavedCart(
  storage: { getItem: (key: string) => string | null } | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : undefined,
): CartItem[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.variantId === "string" &&
        typeof item.priceCents === "number" &&
        typeof item.quantity === "number" &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function loadSavedBundles(
  storage: { getItem: (key: string) => string | null } | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : undefined,
): CartBundle[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(BUNDLE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b) =>
        b &&
        typeof b === "object" &&
        typeof b.bundleId === "string" &&
        typeof b.priceCents === "number" &&
        typeof b.quantity === "number" &&
        b.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadSavedCart);
  const [bundles, setBundles] = useState<CartBundle[]>(loadSavedBundles);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // LocalStorage error handled gracefully
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(BUNDLE_STORAGE_KEY, JSON.stringify(bundles));
    } catch {
      // LocalStorage error handled gracefully
    }
  }, [bundles]);

  const { itemCount, subtotalCents } = useMemo(
    () => computeCartTotals(items, bundles),
    [items, bundles],
  );

  function addItem(item: Omit<CartItem, "quantity">, quantity = 1) {
    setItems((curr) => addItemToCart(curr, item, quantity));
    setIsDrawerOpen(true);
  }

  function removeItem(variantId: string) {
    setItems((curr) => removeItemFromCart(curr, variantId));
  }

  function updateQuantity(variantId: string, quantity: number) {
    setItems((curr) => updateItemQuantity(curr, variantId, quantity));
  }

  function addBundle(bundle: Omit<CartBundle, "quantity">, quantity = 1) {
    setBundles((curr) => addBundleToCart(curr, bundle, quantity));
    setIsDrawerOpen(true);
  }

  function removeBundle(bundleId: string) {
    setBundles((curr) => removeBundleFromCart(curr, bundleId));
  }

  function handleUpdateBundleQuantity(bundleId: string, quantity: number) {
    setBundles((curr) => updateBundleQuantity(curr, bundleId, quantity));
  }

  function clearCart() {
    setItems([]);
    setBundles([]);
  }

  const value = useMemo(
    () => ({
      items,
      bundles,
      itemCount,
      subtotalCents,
      isDrawerOpen,
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
      addItem,
      removeItem,
      updateQuantity,
      addBundle,
      removeBundle,
      updateBundleQuantity: handleUpdateBundleQuantity,
      clearCart,
    }),
    [items, bundles, itemCount, subtotalCents, isDrawerOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
