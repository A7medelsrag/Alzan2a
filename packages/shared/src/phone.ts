const egyptianMobilePattern = /^01[0125]\d{8}$/;
const e164EgyptianMobilePattern = /^\+201[0125]\d{8}$/;

export function normalizeEgyptianPhone(input: string): string | null {
  const compact = input.trim().replace(/[\s()-]/g, "");
  if (egyptianMobilePattern.test(compact)) return `+20${compact.slice(1)}`;
  if (e164EgyptianMobilePattern.test(compact)) return compact;
  return null;
}

export function displayEgyptianPhone(phoneE164: string): string {
  return `0${phoneE164.slice(3)}`;
}
