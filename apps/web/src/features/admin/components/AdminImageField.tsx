import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { uploadAdminImage } from "../api/media";
import { getAdminSession } from "../api/auth";
import { resolvePublicImageUrl } from "../../../utils/media";

interface AdminImageFieldProps {
  label: string;
  value: string;
  csrfToken: string | null;
  disabled?: boolean;
  onChange: (value: string) => void;
  onCsrfTokenChange?: (token: string) => void;
}

export default function AdminImageField({ label, value, csrfToken, disabled = false, onChange, onCsrfTokenChange }: AdminImageFieldProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const previewId = `admin-image-preview-${label.replace(/[^\p{L}\p{N}]+/gu, "-")}`;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/") || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(t("homepageImageInvalid"));
      return;
    }
    setUploading(true);
    try {
      const session = await getAdminSession();
      if (!session) {
        setError(t("homepageAdminDenied"));
        return;
      }
      const currentCsrfToken = session.csrfToken || csrfToken;
      if (!currentCsrfToken) {
        setError(t("homepageAdminDenied"));
        return;
      }
      onCsrfTokenChange?.(currentCsrfToken);
      const uploaded = await uploadAdminImage(file, currentCsrfToken);
      onChange(uploaded.url);
    } catch {
      setError(t("homepageImageUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="admin-image-field">
      <label className="admin-image-field__url" htmlFor={`${previewId}-url`}>{label}
        <input id={`${previewId}-url`} inputMode="url" type="url" value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
      <label className="admin-image-field__upload" aria-disabled={disabled || uploading}>
        <span>{uploading ? t("homepageImageUploading") : t("homepageImageChooseFile")}</span>
        <input accept="image/jpeg,image/png,image/webp" disabled={disabled || uploading} aria-describedby={`${previewId}-hint`} onChange={(event) => void handleFileChange(event)} type="file" />
      </label>
      <small id={`${previewId}-hint`} className="admin-image-field__hint">{t("homepageImageUploadHint")}</small>
      {error && <small className="admin-image-field__error" role="alert">{error}</small>}
      {value && <img className="admin-image-field__preview" src={resolvePublicImageUrl(value)} alt={t("homepageImagePreview")} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
    </div>
  );
}
