import { useEffect, useState } from "react";
import { formatEGP, type BundlePublic } from "@store/shared";
import { useCart } from "../../cart/CartContext";

export interface BundleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: BundlePublic | null;
}

export default function BundleDetailModal({
  isOpen,
  onClose,
  bundle,
}: BundleDetailModalProps) {
  const { addBundle } = useCart();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (bundle) {
      const initialMap: Record<string, string> = {};
      for (const item of bundle.items) {
        if (item.defaultVariantId) {
          initialMap[item.productId] = item.defaultVariantId;
        } else if (item.product?.variants && item.product.variants.length > 0) {
          initialMap[item.productId] = item.product.variants[0]?.id ?? "";
        }
      }
      setSelectedVariants(initialMap);
      setAdded(false);
    }
  }, [bundle]);

  if (!isOpen || !bundle) return null;

  const isAvailable = (bundle.availableStock ?? 0) > 0;

  // Compute total original price of currently selected variants
  let dynamicOriginalPriceCents = 0;
  const chosenVariantDetails: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
  }> = [];

  for (const item of bundle.items) {
    const chosenVariantId = selectedVariants[item.productId];
    const variant = item.product?.variants.find((v) => v.id === chosenVariantId) ?? item.product?.variants[0];
    const price = variant?.priceCents ?? 0;
    dynamicOriginalPriceCents += price * item.quantity;

    if (variant && item.product) {
      chosenVariantDetails.push({
        productId: item.productId,
        variantId: variant.id,
        productName: item.product.name,
        variantName: variant.name,
      });
    }
  }

  let finalPriceCents = dynamicOriginalPriceCents;
  if (bundle.fixedPriceCents !== null && bundle.fixedPriceCents !== undefined) {
    finalPriceCents = bundle.fixedPriceCents;
  } else if (bundle.discountCents !== null && bundle.discountCents !== undefined) {
    finalPriceCents = Math.max(0, dynamicOriginalPriceCents - bundle.discountCents);
  }

  function handleAddToCart() {
    if (!isAvailable || !bundle) return;

    addBundle({
      bundleId: bundle.id,
      bundleTitle: bundle.publicTitle,
      priceCents: finalPriceCents,
      imageUrl: bundle.imageUrl,
      selectedVariants: chosenVariantDetails,
    });

    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1200);
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" dir="rtl">
      <div className="admin-modal-card" style={{ maxWidth: "600px", padding: "1.5rem" }}>
        <div className="admin-modal-header" style={{ marginBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="admin-badge admin-badge-info">باقة توفير متكاملة</span>
              {bundle.isFreeShipping && (
                <span className="admin-badge admin-badge-success">شحن مجاني</span>
              )}
            </div>
            <h2 style={{ margin: "0.5rem 0 0 0", fontSize: "1.4rem" }}>{bundle.publicTitle}</h2>
          </div>
          <button
            type="button"
            className="admin-modal-close"
            onClick={onClose}
            aria-label="إغلاق النافذة"
          >
            ✕
          </button>
        </div>

        {bundle.description && (
          <p style={{ color: "#555", fontSize: "0.95rem", marginBottom: "1rem" }}>
            {bundle.description}
          </p>
        )}

        {/* Components Selection */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>مكونات الباقة واختيار المقاسات:</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {bundle.items.map((item) => {
              const selectedVarId = selectedVariants[item.productId];
              const variants = item.product?.variants ?? [];

              return (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#fafafa",
                  }}
                >
                  <div>
                    <strong>{item.product?.name ?? "منتج الباقة"}</strong>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>
                      الكمية في الباقة: {item.quantity} قطعة
                    </div>
                  </div>

                  <div>
                    {variants.length > 1 ? (
                      <select
                        value={selectedVarId}
                        onChange={(e) =>
                          setSelectedVariants((prev) => ({
                            ...prev,
                            [item.productId]: e.target.value,
                          }))
                        }
                        style={{ padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid #ccc" }}
                        aria-label={`اختر مقاس ${item.product?.name}`}
                      >
                        {variants.map((v) => (
                          <option key={v.id} value={v.id} disabled={v.stockQuantity <= 0}>
                            {v.name} {v.stockQuantity <= 0 ? "(نفد)" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: "0.9rem", color: "#444" }}>
                        {variants[0]?.name ?? "افتراضي"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing & Stock Summary */}
        <div
          style={{
            borderTop: "1px solid #eee",
            paddingTop: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.85rem", color: isAvailable ? "#2e7d32" : "#d32f2f" }}>
              {isAvailable ? `متوفر في المخزن (${bundle.availableStock} باقات متبقية)` : "غير متوفر حالياً"}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#000" }}>
                {formatEGP(finalPriceCents)}
              </span>
              {finalPriceCents < dynamicOriginalPriceCents && (
                <span style={{ textDecoration: "line-through", color: "#888", fontSize: "0.95rem" }}>
                  {formatEGP(dynamicOriginalPriceCents)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!isAvailable || added}
            onClick={handleAddToCart}
            className="customer-primary-button"
            style={{ padding: "0.6rem 1.5rem" }}
          >
            {added ? "تمت الإضافة للسلة ✓" : isAvailable ? "أضف الباقة للسلة" : "غير متوفر"}
          </button>
        </div>
      </div>
    </div>
  );
}
