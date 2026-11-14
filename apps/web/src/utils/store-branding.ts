import i18n from "../i18n";

export interface PublicStoreBranding {
  storeName: string;
  dashboardName: string;
  buttonColor: string;
  backgroundColor: string;
}

const DEFAULT_BRANDING: PublicStoreBranding = {
  storeName: "Zan2a",
  dashboardName: "zan2a | زنقة",
  buttonColor: "#7a1535",
  backgroundColor: "#faf6f3",
};

let currentBranding: PublicStoreBranding = { ...DEFAULT_BRANDING };

export const STORE_BRANDING_EVENT = "store-branding-updated";

export function getCachedStoreBranding(): PublicStoreBranding {
  return currentBranding;
}

export function applyStoreBranding(partial: Partial<PublicStoreBranding>): void {
  currentBranding = {
    storeName: partial.storeName?.trim() || currentBranding.storeName,
    dashboardName: partial.dashboardName?.trim() || currentBranding.dashboardName,
    buttonColor: partial.buttonColor || currentBranding.buttonColor,
    backgroundColor: partial.backgroundColor || currentBranding.backgroundColor,
  };

  // Update i18next brandName so all storefront headers/footers/titles reflect the saved storeName
  i18n.addResource("ar", "translation", "brandName", currentBranding.storeName);
  i18n.addResource("en", "translation", "brandName", currentBranding.storeName);

  // Apply dynamic theme CSS variables on :root
  if (typeof document !== "undefined") {
    const root = document.documentElement.style;
    root.setProperty("--color-cream", currentBranding.backgroundColor);
    root.setProperty("--color-burgundy-600", currentBranding.buttonColor);
    root.setProperty(
      "--color-burgundy-500",
      `color-mix(in srgb, ${currentBranding.buttonColor} 85%, white)`,
    );
    root.setProperty(
      "--color-burgundy-700",
      `color-mix(in srgb, ${currentBranding.buttonColor} 82%, black)`,
    );
    root.setProperty(
      "--color-burgundy-900",
      `color-mix(in srgb, ${currentBranding.buttonColor} 65%, black)`,
    );
    root.setProperty(
      "--color-burgundy-soft",
      `color-mix(in srgb, ${currentBranding.buttonColor} 8%, white)`,
    );
    root.setProperty(
      "--color-burgundy-faint",
      `color-mix(in srgb, ${currentBranding.buttonColor} 12%, white)`,
    );

    window.dispatchEvent(
      new CustomEvent<PublicStoreBranding>(STORE_BRANDING_EVENT, {
        detail: currentBranding,
      }),
    );
  }
}

export async function loadAndApplyStoreBranding(): Promise<void> {
  try {
    const response = await fetch("/api/v1/store/settings", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return;
    const body = (await response.json()) as { data?: Partial<PublicStoreBranding> };
    if (body?.data) {
      applyStoreBranding(body.data);
    }
  } catch {
    // Keep default branding if offline/unavailable
  }
}
