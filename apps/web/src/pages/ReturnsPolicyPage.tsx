import { useState } from "react";
import { Link } from "react-router";
import StoreLayout from "../components/StoreLayout";

const policySections = [
  { id: "delivery-duration", title: "مدة التوصيل" },
  { id: "shipping-cost", title: "تكلفة الشحن" },
  { id: "free-shipping", title: "الشحن المجاني" },
  { id: "returns", title: "الاسترجاع" },
  { id: "exchanges", title: "الاستبدال" },
  { id: "exceptions", title: "الاستثناءات" },
  { id: "refunds", title: "استرداد المبلغ" },
] as const;

const shippingRates = [
  { area: "القاهرة والجيزة", cost: "60 ج.م", duration: "1–2 يوم" },
  { area: "الإسكندرية", cost: "65 ج.م", duration: "2–3 أيام" },
  { area: "الدلتا والقناة", cost: "70 ج.م", duration: "2–4 أيام" },
  { area: "الصعيد", cost: "80 ج.م", duration: "3–5 أيام" },
];

export default function ReturnsPolicyPage() {
  const [activeSection, setActiveSection] = useState<(typeof policySections)[number]["id"]>(
    policySections[0].id,
  );

  return (
    <StoreLayout>
      <div className="returns-policy">
        <nav aria-label="مسار التنقل" className="returns-policy__breadcrumb">
          <Link to="/">الرئيسية</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">سياسة الشحن والاسترجاع</span>
        </nav>

        <header className="returns-policy__hero">
          <h1>سياسة الشحن والاسترجاع</h1>
          <p>كل اللي محتاجة تعرفيه عن التوصيل والاسترجاع والاستبدال.</p>
        </header>

        <div className="returns-policy__layout">
          <aside aria-label="محتويات الصفحة" className="returns-policy__toc">
            <h2>محتويات الصفحة</h2>
            <nav aria-label="أقسام سياسة الشحن والاسترجاع">
              {policySections.map((section) => (
                <a
                  aria-current={activeSection === section.id ? "location" : undefined}
                  className={`returns-policy__toc-link${activeSection === section.id ? " returns-policy__toc-link--active" : ""}`}
                  href={`#${section.id}`}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="returns-policy__content">
            <section
              aria-labelledby="delivery-duration-title"
              className="returns-policy__section"
              id="delivery-duration"
            >
              <h2 id="delivery-duration-title">مدة التوصيل</h2>
              <p>
                توصيل لكل المحافظات خلال 2–5 أيام عمل من تأكيد الطلب، حسب المحافظة. قد تختلف
                المدة في بعض المناطق.
              </p>
            </section>

            <section
              aria-labelledby="shipping-cost-title"
              className="returns-policy__section"
              id="shipping-cost"
            >
              <h2 id="shipping-cost-title">تكلفة الشحن</h2>
              <p>بتتحدد تكلفة الشحن حسب المحافظة وبتظهر لكِ في صفحة إتمام الطلب قبل التأكيد.</p>
              <div
                aria-label="جدول تكلفة الشحن"
                className="returns-policy__table-wrap"
                role="region"
                tabIndex={0}
              >
                <table className="returns-policy__table">
                  <thead>
                    <tr>
                      <th scope="col">المنطقة</th>
                      <th scope="col">تكلفة الشحن</th>
                      <th scope="col">مدة التوصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippingRates.map((rate) => (
                      <tr key={rate.area}>
                        <th scope="row">{rate.area}</th>
                        <td>{rate.cost}</td>
                        <td>{rate.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="returns-policy__note">القيم أعلاه، وتتحدد تكلفة الشحن من لوحة التحكم حسب المحافظة.</p>
            </section>

            <section
              aria-labelledby="free-shipping-title"
              className="returns-policy__section"
              id="free-shipping"
            >
              <h2 id="free-shipping-title">الشحن المجاني</h2>
              <p>
                الطلبات فوق 1,000 ج.م شحنها مجاني، وبعض المنتجات بيكون عليها علامة «شحن مجاني»
                بغض النظر عن قيمة الطلب.
              </p>
            </section>

            <section aria-labelledby="returns-title" className="returns-policy__section" id="returns">
              <h2 id="returns-title">الاسترجاع</h2>
              <p>تقدري ترجعي المنتج خلال 14 يوم من الاستلام بشرط:</p>
              <ol>
                <li>يكون في حالته الأصلية مع التيكت.</li>
                <li>بالتغليف والفاتورة الأصلية.</li>
                <li>تتواصلي معنا قبل ما تنتهي المدة المحددة.</li>
              </ol>
            </section>

            <section
              aria-labelledby="exchanges-title"
              className="returns-policy__section"
              id="exchanges"
            >
              <h2 id="exchanges-title">الاستبدال</h2>
              <p>
                تقدري تستبدلي المقاس أو اللون خلال 14 يوم حسب المتاح في المخزون، ولو المقاس مش
                متاح هنقترح عليكِ البديل المناسب.
              </p>
            </section>

            <section
              aria-labelledby="exceptions-title"
              className="returns-policy__section"
              id="exceptions"
            >
              <h2 id="exceptions-title">الاستثناءات</h2>
              <p>
                مش بنقبل استرجاع الملابس الداخلية والمنتجات المستخدمة أو اللي اتغيرت حالتها،
                ومستحضرات المنزل أو المنتج تم فتحه.
              </p>
            </section>

            <section aria-labelledby="refunds-title" className="returns-policy__section" id="refunds">
              <h2 id="refunds-title">استرداد المبلغ</h2>
              <p>
                بعد استلام المنتج وفحصه بنرجع لكِ المبلغ خلال 3–7 أيام عمل بنفس طريقة الدفع، أو
                نضيفه في حسابك.
              </p>
            </section>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
