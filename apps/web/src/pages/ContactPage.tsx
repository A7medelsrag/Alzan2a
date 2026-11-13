import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import StoreLayout from "../components/StoreLayout";

const SUPPORT_EMAIL = "support@zan2a.store";
const SUPPORT_PHONE = "01001234567";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("استفسار عن طلب قائم أو تتبع الشحنة");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = [
      `الاسم: ${name.trim()}`,
      `رقم الهاتف: ${phone.trim()}`,
      `نوع الاستفسار: ${subject}`,
      "",
      message.trim(),
    ].join("\n");

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`رسالة من موقع زنقة: ${subject}`)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <StoreLayout activeNav="contact">
      <div className="contact-page">
        <nav aria-label="مسار التنقل" className="contact-breadcrumb">
          <Link to="/">الرئيسية</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">تواصل معنا</span>
        </nav>

        <header className="contact-hero">
          <h1>تواصل معنا</h1>
          <p>لو عندك سؤال أو مشكلة في طلبك، إحنا هنا نساعدك.</p>
        </header>

        <div className="contact-layout">
          <section aria-labelledby="contact-form-title" className="contact-form-card">
            <h2 id="contact-form-title">ابعتي لنا رسالة</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <label className="contact-field" htmlFor="contact-name">
                <span>الاسم بالكامل <span aria-hidden="true" className="contact-required">*</span></span>
                <input
                  autoComplete="name"
                  id="contact-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="اسمك"
                  required
                  value={name}
                />
              </label>

              <div className="contact-form__row">
                <label className="contact-field" htmlFor="contact-phone">
                  <span>رقم الموبايل <span aria-hidden="true" className="contact-required">*</span></span>
                  <input
                    autoComplete="tel"
                    dir="ltr"
                    id="contact-phone"
                    inputMode="tel"
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="01xxxxxxxxx"
                    required
                    value={phone}
                  />
                </label>

                <label className="contact-field" htmlFor="contact-subject">
                  <span>الموضوع <span aria-hidden="true" className="contact-required">*</span></span>
                  <select
                    id="contact-subject"
                    onChange={(event) => setSubject(event.target.value)}
                    value={subject}
                  >
                    <option>استفسار عن طلب قائم أو تتبع الشحنة</option>
                    <option>طلب استبدال أو استرجاع</option>
                    <option>سؤال عن منتج أو مقاس</option>
                    <option>شكوى أو اقتراح</option>
                    <option>موضوع آخر</option>
                  </select>
                </label>
              </div>

              <label className="contact-field" htmlFor="contact-message">
                <span>الرسالة <span aria-hidden="true" className="contact-required">*</span></span>
                <textarea
                  id="contact-message"
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="اكتبي رسالتك هنا"
                  required
                  rows={5}
                  value={message}
                />
              </label>

              <p className="contact-form__hint">سيتم فتح تطبيق البريد الإلكتروني لإرسال رسالتك.</p>
              <button className="contact-submit" type="submit">إرسال الرسالة</button>
            </form>
          </section>

          <aside aria-label="معلومات التواصل" className="contact-details">
            <section className="contact-whatsapp">
              <h2>أسرع طريقة للرد</h2>
              <p>كلمينا على واتساب وهنرد عليكِ في أقرب وقت.</p>
              <a href="https://wa.me/201001234567" rel="noopener noreferrer" target="_blank">
                تواصلي معنا على واتساب
              </a>
            </section>

            <section className="contact-detail-card">
              <h2>اتصلي بنا</h2>
              <a dir="ltr" href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>
            </section>

            <section className="contact-detail-card">
              <h2>البريد الإلكتروني</h2>
              <a dir="ltr" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </section>

            <section className="contact-detail-card">
              <h2>مواعيد العمل</h2>
              <p>كل يوم من 9 ص إلى 10 م</p>
              <span>نرد على الرسائل خلال ساعات العمل</span>
            </section>

            <section aria-label="تابعينا" className="contact-detail-card contact-social-card">
              <h2>تابعينا</h2>
              <div className="contact-social-list">
                <span>فيسبوك</span>
                <span>إنستجرام</span>
                <span>تيك توك</span>
              </div>
            </section>
          </aside>
        </div>

        <p className="contact-faq">
          ممكن تلاقي إجابتك بسرعة في <Link to="/faq">الأسئلة الشائعة</Link>
        </p>
      </div>
    </StoreLayout>
  );
}
