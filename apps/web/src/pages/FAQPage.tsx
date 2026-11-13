import { useState } from "react";
import { Link } from "react-router";
import StoreLayout from "../components/StoreLayout";

interface FAQItem {
  id: string;
  category: "shipping" | "payment" | "returns" | "orders";
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: "s1",
    category: "shipping",
    question: "كم تبلغ تكلفة الشحن لمحافظتي؟",
    answer:
      "نوفر أسعار شحن ثابتة وعادلة: القاهرة والجيزة: 40 ج.م، الإسكندرية ومحافظات الدلتا: 50 ج.م، محافظات القناة: 55 ج.م، محافظات الصعيد: 65 ج.م، المحافظات الحدودية (مطروح، البحر الأحمر، الوادي الجديد): 80 ج.م. وتكون مصاريف الشحن مجانية بالكامل لأي طلب بقيمة 1,000 ج.م أو أكثر!",
  },
  {
    id: "s2",
    category: "shipping",
    question: "كم يستغرق وصول الطلب؟",
    answer:
      "تصل طلبات القاهرة والجيزة والإسكندرية خلال 24 إلى 48 ساعة عمل من تأكيد الطلب. أما باقي محافظات الجمهورية فتصل خلال 2 إلى 4 أيام عمل.",
  },
  {
    id: "s3",
    category: "shipping",
    question: "ما هي شركات الشحن التي تتعاملون معها؟",
    answer:
      "نتعامل مع كبرى شركات الشحن الاحترافية في مصر مثل (بوسطة Bosta، وأرامكس Aramex)، وسيقوم المندوب بالتواصل معكِ هاتفياً أو عبر واتساب قبل موعد التسليم لتنسيق الوقت المناسب.",
  },
  {
    id: "p1",
    category: "payment",
    question: "هل يمكنني معاينة وقياس المنتج قبل الدفع للمندوب؟",
    answer:
      "نعم، بكل تأكيد! نحن في متجر زنقة نضمن لكِ حق المعاينة الكاملة للشحنة وفحص الخامات والمقاسات أمام مندوب التوصيل قبل دفع قيمة الأوردر.",
  },
  {
    id: "p2",
    category: "payment",
    question: "ما هي طرق الدفع المتاحة في المتجر؟",
    answer:
      "الطريقة الأساسية والأكثر أماناً هي الدفع نقداً (كاش) عند الاستلام بعد معاينة المنتج. كما نقبل التحويل عبر إنستاباي ومحافظ فودافون كاش لمن يرغب.",
  },
  {
    id: "r1",
    category: "returns",
    question: "ما هي سياسة الاستبدال والاسترجاع؟",
    answer:
      "نضمن لكِ حق الاستبدال أو الاسترجاع خلال 14 يوماً من تاريخ استلام الشحنة، بشرط أن يكون المنتج بحالته الأصلية غير مستخدم ومرفقاً بكافة تيكتات وبطاقات المتجر في غلافه الأصلي.",
  },
  {
    id: "r2",
    category: "returns",
    question: "إذا كان المقاس غير مناسب، كيف أقوم بتبديله؟",
    answer:
      "كل ما عليكِ هو مراسلتنا عبر واتساب أو الاتصال بخدمة العملاء وإبلاغنا برقم الطلب والمقاس الجديد المطلوب. سيقوم المندوب بالحضور إليكِ ومعه المقاس الجديد وتسليمه لكِ مع استلام المقاس القديم.",
  },
  {
    id: "r3",
    category: "returns",
    question: "من يتحمل مصاريف الشحن عند الاسترجاع أو الاستبدال؟",
    answer:
      "إذا كان الاستبدال بسبب خطأ من طرفنا (مقاس غير مطابق، أو عيب مصنعي) يتحمل متجر زنقة مصاريف الشحن بالكامل. أما إذا كان الاستبدال أو الاسترجاع برغبة من العميلة، فتتحمل العميلة تكلفة شحن المشوار فقط.",
  },
  {
    id: "o1",
    category: "orders",
    question: "كيف يمكنني تتبع حالة طلبي؟",
    answer:
      "بمجرد إتمام طلبكِ، يتم تحويلكِ لصفحة تتبع الطلب وتصلكِ رسالة تأكيد. يمكنكِ تتبع مسار الشحنة من صفحة 'حسابي' إذا كنتِ مسجلة، أو عبر رابط الأوردر المباشر، أو بالتواصل مع خدمة العملاء برقم طلبكِ.",
  },
  {
    id: "o2",
    category: "orders",
    question: "كيف أستخدم كود الخصم (الكوبون)؟",
    answer:
      "في صفحة سلة المشتريات (/cart)، ستجدين حقلاً مخصصاً لإدخال 'كود الخصم'. اكتبي الكود واضغطي 'تطبيق' وسيتم خصم القيمة فوراً من إجمالي الفاتورة.",
  },
  {
    id: "o3",
    category: "orders",
    question: "هل أحتاج لإنشاء حساب حتى أتمكن من الطلب؟",
    answer:
      "لا، الحساب اختياري تماماً! يمكنكِ إتمام الطلب كـ 'زائرة' وإدخال عنوانكِ ورقم هاتفكِ بكل سهولة وسرعة. لكن امتلاك حساب يتيح لكِ حفظ عناوينكِ وتتبع تاريخ طلباتكِ وحفظ المفضلة.",
  },
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "shipping" | "payment" | "returns" | "orders">("all");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ s1: true, p1: true, r1: true });

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFaqs = faqs.filter((f) => (selectedCategory === "all" ? true : f.category === selectedCategory));

  return (
    <StoreLayout activeNav="faq">
      <div style={{ maxWidth: "900px", margin: "2rem auto 4rem", padding: "0 1.25rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span style={{ color: "#7a1535", fontWeight: "800", fontSize: "0.9rem" }}>مركز المساعدة</span>
          <h1 style={{ fontSize: "2.2rem", fontWeight: "900", color: "#0f172a", margin: "0.5rem 0 1rem" }}>
            الأسئلة الشائعة
          </h1>
          <p style={{ color: "#64748b", maxWidth: "600px", margin: "0 auto", fontSize: "1rem", lineHeight: 1.6 }}>
            كل ما تودين معرفته حول الشحن، الدفع، المعاينة، الاستبدال والاسترجاع في مكان واحد.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginBottom: "2.5rem" }}>
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "9999px",
              fontSize: "0.88rem",
              fontWeight: "700",
              border: "1px solid",
              borderColor: selectedCategory === "all" ? "#7a1535" : "#cbd5e1",
              background: selectedCategory === "all" ? "#7a1535" : "#ffffff",
              color: selectedCategory === "all" ? "#ffffff" : "#475569",
              cursor: "pointer",
            }}
          >
            جميع الأسئلة
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("shipping")}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "9999px",
              fontSize: "0.88rem",
              fontWeight: "700",
              border: "1px solid",
              borderColor: selectedCategory === "shipping" ? "#7a1535" : "#cbd5e1",
              background: selectedCategory === "shipping" ? "#7a1535" : "#ffffff",
              color: selectedCategory === "shipping" ? "#ffffff" : "#475569",
              cursor: "pointer",
            }}
          >
            🚚 الشحن والتوصيل
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("payment")}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "9999px",
              fontSize: "0.88rem",
              fontWeight: "700",
              border: "1px solid",
              borderColor: selectedCategory === "payment" ? "#7a1535" : "#cbd5e1",
              background: selectedCategory === "payment" ? "#7a1535" : "#ffffff",
              color: selectedCategory === "payment" ? "#ffffff" : "#475569",
              cursor: "pointer",
            }}
          >
            💵 الدفع والمعاينة
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("returns")}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "9999px",
              fontSize: "0.88rem",
              fontWeight: "700",
              border: "1px solid",
              borderColor: selectedCategory === "returns" ? "#7a1535" : "#cbd5e1",
              background: selectedCategory === "returns" ? "#7a1535" : "#ffffff",
              color: selectedCategory === "returns" ? "#ffffff" : "#475569",
              cursor: "pointer",
            }}
          >
            🔄 الاستبدال والاسترجاع
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("orders")}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "9999px",
              fontSize: "0.88rem",
              fontWeight: "700",
              border: "1px solid",
              borderColor: selectedCategory === "orders" ? "#7a1535" : "#cbd5e1",
              background: selectedCategory === "orders" ? "#7a1535" : "#ffffff",
              color: selectedCategory === "orders" ? "#ffffff" : "#475569",
              cursor: "pointer",
            }}
          >
            🛍️ الطلبات والكوبونات
          </button>
        </div>

        {/* Accordion List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredFaqs.map((faq) => {
            const isOpen = Boolean(openIds[faq.id]);
            return (
              <div
                key={faq.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  overflow: "hidden",
                  boxShadow: isOpen ? "0 4px 12px rgba(0,0,0,0.04)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1.25rem 1.5rem",
                    background: isOpen ? "#f8fafc" : "#ffffff",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "right",
                  }}
                >
                  <span style={{ fontSize: "1.05rem", fontWeight: "700", color: isOpen ? "#7a1535" : "#0f172a" }}>
                    {faq.question}
                  </span>
                  <span
                    style={{
                      fontSize: "1.2rem",
                      color: isOpen ? "#7a1535" : "#94a3b8",
                      transform: isOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "1.25rem 1.5rem",
                      color: "#334155",
                      fontSize: "0.95rem",
                      lineHeight: 1.8,
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still need help callout */}
        <div
          style={{
            marginTop: "3.5rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "2rem",
            borderRadius: "1.25rem",
            textAlign: "center",
          }}
        >
          <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a", margin: "0 0 0.5rem" }}>
            لم تجدي إجابة لسؤالكِ؟
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 1.25rem" }}>
            فريق الدعم والمبيعات لدينا متواجد لمساعدتكِ طوال الأسبوع.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link
              to="/contact"
              style={{
                background: "#7a1535",
                color: "#ffffff",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              تواصلِ معنا
            </Link>
            <a
              href="https://wa.me/201001234567"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#16a34a",
                color: "#ffffff",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              محادثة واتساب سريعة
            </a>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
