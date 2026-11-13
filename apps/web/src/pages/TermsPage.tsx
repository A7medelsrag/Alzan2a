import { Link } from "react-router";
import StoreLayout from "../components/StoreLayout";

export default function TermsPage() {
  return (
    <StoreLayout>
      <div style={{ maxWidth: "900px", margin: "2rem auto 4rem", padding: "0 1.25rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span style={{ color: "#7a1535", fontWeight: "800", fontSize: "0.9rem" }}>الشفافية والأمان</span>
          <h1 style={{ fontSize: "2.2rem", fontWeight: "900", color: "#0f172a", margin: "0.5rem 0 1rem" }}>
            الشروط والأحكام وسياسة الخصوصية
          </h1>
          <p style={{ color: "#64748b", maxWidth: "600px", margin: "0 auto", fontSize: "1rem", lineHeight: 1.6 }}>
            تحكم هذه الوثيقة استخدامكِ لمتجر زنقة الإلكتروني وحماية بياناتكِ وخصوصيتكِ عند التسوق.
          </p>
        </div>

        {/* Content Body */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", color: "#334155", lineHeight: 1.8 }}>
          <section style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1.25rem", padding: "1.75rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0f172a", marginBottom: "0.75rem" }}>
              1. شروط الاستخدام العامة
            </h2>
            <p>
              باستخدامكِ لموقع متجر زنقة أو تقديم طلب شراء، فإنكِ تقرين بموافقتكِ الكاملة على هذه الشروط والأحكام. يحق لإدارة المتجر تحديث وتعديل هذه الشروط في أي وقت مع نشر التعديلات على هذه الصفحة.
            </p>
            <p style={{ margin: 0 }}>
              يجب أن تكون المعلومات المقدمة أثناء إنشاء الطلب (مثل الاسم، رقم الهاتف المحمول، وعنوان التوصيل) صحيحة ودقيقة لضمان وصول الشحنة دون تأخير.
            </p>
          </section>

          <section style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1.25rem", padding: "1.75rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0f172a", marginBottom: "0.75rem" }}>
              2. سياسة الخصوصية وأمان البيانات
            </h2>
            <p>
              نحن نلتزم بأعلى معايير حماية البيانات والخصوصية الرقمية:
            </p>
            <ul style={{ paddingRight: "1.25rem", margin: 0 }}>
              <li><strong>البيانات التي نجمعها:</strong> تشمل الاسم، رقم الهاتف المصري، عنوان التوصيل، والبريد الإلكتروني فقط لتنفيذ الطلبات وتسهيل تتبع الشحنات.</li>
              <li><strong>سرية المعلومات:</strong> لا نقوم ببيع، تأجير، أو مشاركة بياناتكِ الشخصية مع أي طرف ثالث لأغراض إعلانية. تتم مشاركة بيانات التوصيل الأساسية فقط مع شركة الشحن المعتمدة لتسليم الأوردر.</li>
              <li><strong>حماية كلمات المرور:</strong> يتم تشفير كلمات المرور باستخدام أحدث خوارزميات التشفير (Argon2id)، كما أن جلسات الدخول محمية بملفات تعريف ارتباط آمنة (`__Host-` SameSite=Strict).</li>
            </ul>
          </section>

          <section style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1.25rem", padding: "1.75rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0f172a", marginBottom: "0.75rem" }}>
              3. الأسعار والدفع عند الاستلام
            </h2>
            <p>
              جميع الأسعار المعروضة على المتجر بالجنيه المصري (EGP) وهي شاملة لكافة الضرائب المقررة.
            </p>
            <p style={{ margin: 0 }}>
              يتم سداد قيمة الطلب نقداً (كاش) عند استلام الشحنة أمام المندوب. في حال استخدام كوبونات الخصم، يتم احتساب الخصم تلقائياً قبل تأكيد الأوردر ويظهر مفصلاً في الفاتورة.
            </p>
          </section>

          <section style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1.25rem", padding: "1.75rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0f172a", marginBottom: "0.75rem" }}>
              4. سياسة الإلغاء وتعديل الطلبات
            </h2>
            <p>
              يحق للعميلة إلغاء الطلب أو تعديل تفاصيل العنوان أو المقاسات دون أي رسوم طالما كان الطلب في مرحلة "قيد المراجعة" أو "تم التأكيد" ولم يتم تسليمه لشركة الشحن بعد.
            </p>
            <p style={{ margin: 0 }}>
              بمجرد خروج الشحنة للتوصيل (حالة "تم الشحن")، يرجى مراجعة <Link to="/returns" style={{ color: "#7a1535", fontWeight: "bold" }}>سياسة الاستبدال والاسترجاع</Link>.
            </p>
          </section>

          <section style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1.25rem", padding: "1.75rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0f172a", marginBottom: "0.75rem" }}>
              5. الملكية الفكرية وحقوق النشر
            </h2>
            <p style={{ margin: 0 }}>
              جميع المحتويات المنشورة على هذا الموقع، بما في ذلك النصوص، التصاميم، الصور، الشعارات، والعلامة التجارية "زنقة ستور" هي ملكية حصرية ومحمية بموجب قوانين الملكية الفكرية المعمول بها في جمهورية مصر العربية.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: "center", marginTop: "3rem", color: "#64748b", fontSize: "0.88rem" }}>
          <span>آخر تحديث لهذه الشروط: نوفمبر 2026</span>
          <div style={{ marginTop: "0.5rem" }}>
            <Link to="/contact" style={{ color: "#7a1535", fontWeight: "bold" }}>تواصلي معنا إذا كان لديكِ أي استفسار قانوني أو تنظيمي</Link>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
