import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import type { ProductReviewsResponse } from "@store/shared";
import { useCustomerSession } from "../../customer/CustomerSession";
import { fetchProductReviews, submitProductReview } from "../api/reviews";

interface ProductReviewsModalProps {
  product: {
    id: string;
    name: string;
    imageUrl?: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductReviewsModal({
  product,
  isOpen,
  onClose,
}: ProductReviewsModalProps) {
  const { customer, csrfToken } = useCustomerSession();
  const [reviewsData, setReviewsData] = useState<ProductReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen || !product) return;
    let active = true;
    setLoading(true);
    setError("");

    void fetchProductReviews(product.id)
      .then((data) => {
        if (active) {
          setReviewsData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError("تعذر تحميل التقييمات. يرجى المحاولة مرة أخرى.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  async function handleSubmitReview(e: FormEvent) {
    e.preventDefault();
    if (!csrfToken || !product) return;
    setSubmitting(true);
    setFormError("");

    try {
      await submitProductReview(
        product.id,
        {
          rating,
          comment: comment.trim() || null,
        },
        csrfToken,
      );

      setNotice("شكرًا لكِ! تم إرسال تقييمك بنجاح.");
      setComment("");
      // Reload reviews
      const updated = await fetchProductReviews(product.id);
      setReviewsData(updated);
      setTimeout(() => setNotice(""), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("حدث خطأ أثناء إرسال التقييم.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const stats = reviewsData?.stats;
  const items = reviewsData?.items ?? [];

  return (
    <div className="reviews-modal-overlay" onClick={onClose} dir="rtl">
      <div
        className="reviews-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reviews-modal-title"
      >
        <div className="reviews-modal-header">
          <div className="reviews-modal-product-info">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="reviews-modal-thumb"
              />
            )}
            <div>
              <h2 id="reviews-modal-title" className="reviews-modal-title">
                تقييمات وآراء العملاء
              </h2>
              <p className="reviews-modal-product-name">{product.name}</p>
            </div>
          </div>
          <button
            type="button"
            className="reviews-modal-close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <div className="reviews-modal-body">
          {loading ? (
            <div className="reviews-loading">جاري تحميل التقييمات...</div>
          ) : error ? (
            <div className="reviews-alert reviews-alert-error">{error}</div>
          ) : (
            <>
              {/* Rating Summary Card */}
              <div className="reviews-summary-card">
                <div className="reviews-score-col">
                  <div className="reviews-average-score">
                    {stats?.averageRating ? stats.averageRating.toFixed(1) : "0.0"}
                  </div>
                  <div className="reviews-stars">
                    {"★".repeat(Math.round(stats?.averageRating ?? 0))}
                    {"☆".repeat(5 - Math.round(stats?.averageRating ?? 0))}
                  </div>
                  <div className="reviews-count-text">
                    {stats?.totalReviews
                      ? `بناءً على ${stats.totalReviews} تقييم`
                      : "لا توجد تقييمات بعد"}
                  </div>
                </div>

                <div className="reviews-breakdown-col">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = stats?.ratingDistribution?.[String(star)] ?? 0;
                    const total = stats?.totalReviews ?? 0;
                    const percent = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={star} className="reviews-breakdown-row">
                        <span className="reviews-star-label">{star} ★</span>
                        <div className="reviews-bar-track">
                          <div
                            className="reviews-bar-fill"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="reviews-star-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Submission Form / Guest Callout */}
              <div className="reviews-form-section">
                {notice && (
                  <div className="reviews-alert reviews-alert-success" role="status">
                    {notice}
                  </div>
                )}

                {customer ? (
                  <form onSubmit={handleSubmitReview} className="reviews-form">
                    <h3 className="reviews-form-title">أضيفي تقييمكِ وتجربتكِ</h3>

                    {formError && (
                      <div className="reviews-alert reviews-alert-error" role="alert">
                        {formError}
                      </div>
                    )}

                    <div className="reviews-rating-picker">
                      <span className="reviews-picker-label">تقييمكِ العام:</span>
                      <div className="reviews-star-buttons" role="radiogroup">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`reviews-star-btn ${s <= rating ? "is-selected" : ""}`}
                            onClick={() => setRating(s)}
                            aria-label={`${s} نجوم`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="reviews-form-group">
                      <label htmlFor="review-comment">رأيكِ في المنتج (اختياري)</label>
                      <textarea
                        id="review-comment"
                        rows={3}
                        maxLength={1000}
                        placeholder="ما رأيك في جودة المنتج، المقاس، سرعة التوصيل؟"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="reviews-textarea"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="reviews-submit-btn"
                    >
                      {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
                    </button>
                  </form>
                ) : (
                  <div className="reviews-guest-card">
                    <p>هل قمتِ بتجربة هذا المنتج؟</p>
                    <Link to="/login" className="reviews-guest-link">
                      سجّلي دخولكِ لإضافة تقييمكِ وتجربتكِ
                    </Link>
                  </div>
                )}
              </div>

              {/* Reviews List */}
              <div className="reviews-list-section">
                <h3 className="reviews-list-title">آراء العملاء ({items.length})</h3>

                {items.length === 0 ? (
                  <p className="reviews-empty-text">
                    لا توجد تقييمات بعد. كوني أول من يشارك تجربته مع هذا المنتج!
                  </p>
                ) : (
                  <div className="reviews-items">
                    {items.map((rev) => (
                      <article key={rev.id} className="review-card">
                        <div className="review-card-header">
                          <div>
                            <div className="review-author-line">
                              <span className="review-author">{rev.customerName}</span>
                              {rev.isVerifiedPurchase && (
                                <span className="review-verified-badge">
                                  ✓ شراء مؤكد
                                </span>
                              )}
                            </div>
                            <div className="review-stars-row">
                              {"★".repeat(rev.rating)}
                              {"☆".repeat(5 - rev.rating)}
                            </div>
                          </div>
                          <time className="review-date">
                            {new Date(rev.createdAt).toLocaleDateString("ar-EG", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </time>
                        </div>
                        {rev.comment && (
                          <p className="review-comment">{rev.comment}</p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
