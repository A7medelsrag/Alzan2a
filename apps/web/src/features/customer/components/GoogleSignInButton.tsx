import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CustomerAuthError, loginWithGoogle } from "../api/account.js";
import type { CustomerPublic } from "@store/shared";

type GoogleSignInButtonProps = {
  disabled?: boolean;
  onSuccess: (session: { data: CustomerPublic; csrfToken: string }) => void;
  onError: (error: CustomerAuthError | Error) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; width?: number; text?: string; locale?: string },
          ) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({ disabled, onSuccess, onError }: GoogleSignInButtonProps) {
  const { t } = useTranslation();
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const clientId = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || typeof window === "undefined" || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          const session = await loginWithGoogle(response.credential);
          onSuccess(session);
        } catch (err) {
          onError(err instanceof CustomerAuthError ? err : new CustomerAuthError("unavailable"));
        }
      },
    });

    if (buttonContainerRef.current) {
      window.google.accounts.id.renderButton(buttonContainerRef.current, {
        theme: "outline",
        size: "large",
        locale: "ar",
        text: "continue_with",
      });
    }
  }, [clientId, onSuccess, onError]);

  async function handleClick() {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      onError(new CustomerAuthError("unavailable"));
    }
  }

  return (
    <div className="customer-oauth-container">
      <div ref={buttonContainerRef} />
      <button
        type="button"
        className="customer-google-button"
        disabled={disabled}
        onClick={handleClick}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{t("googleSignInAction")}</span>
      </button>
    </div>
  );
}
