import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { uploadAdminImage } from "../api/media";

interface AdminImageFieldProps {
  label: string;
  value: string;
  csrfToken: string | null;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function AdminImageField({ label, value, csrfToken, disabled = false, onChange }: AdminImageFieldProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError("");
    if (!csrfToken) {
      setError(t("homepageAdminDenied"));
      return;
    }
    if (!file.type.startsWith("image/") || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(t("homepageImageInvalid"));
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadAdminImage(file, csrfToken);
      onChange(uploaded.url);
    } catch {
      setError(t("homepageImageUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="admin-image-field">
      <label className="admin-image-field__url">{label}
        <input inputMode="url" type="url" value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
      <label className="admin-image-field__upload" aria-disabled={disabled || uploading}>
        <span>{uploading ? t("homepageImageUploading") : t("homepageImageChooseFile")}</span>
        <input accept="image/jpeg,image/png,image/webp" disabled={disabled || uploading} onChange={(event) => void handleFileChange(event)} type="file" />
      </label>
      <small className="admin-image-field__hint">{t("homepageImageUploadHint")}</small>
      {error && <small className="admin-image-field__error" role="alert">{error}</small>}
      {value && <img className="admin-image-field__preview" src={value} alt={t("homepageImagePreview")} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
    </div>
  );
}
