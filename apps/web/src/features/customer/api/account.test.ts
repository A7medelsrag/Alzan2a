import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerAuthError, loginCustomer, loginWithGoogle, logoutCustomer, registerCustomer } from "./account";

afterEach(() => {
  vi.unstubAllGlobals();
});

const sessionResponse = {
  data: {
    id: "11111111-1111-4111-8111-111111111111",
    fullName: "منى أحمد",
    phone: "01012345678",
  },
  csrfToken: "csrf-token-with-sufficient-length-123456",
};

describe("customer account API", () => {
  it("sends login credentials without storing them and accepts the session cookie response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(sessionResponse)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loginCustomer({ phone: "01012345678", password: "A private phrase 2026" }))
      .resolves.toEqual(sessionResponse);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/store/customer/login",
      expect.objectContaining({
        cache: "no-store",
        credentials: "include",
        method: "POST",
        body: JSON.stringify({ phone: "01012345678", password: "A private phrase 2026" }),
      }),
    );
  });

  it("maps duplicate registrations to a user-facing account error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "CUSTOMER_PHONE_ALREADY_REGISTERED" },
    }), { status: 409 })));

    await expect(registerCustomer({
      fullName: "منى أحمد",
      phone: "01012345678",
      password: "A private phrase 2026",
      passwordConfirmation: "A private phrase 2026",
    })).rejects.toEqual(new CustomerAuthError("phoneTaken"));
  });

  it("sends the in-memory CSRF token when logging out", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await logoutCustomer(sessionResponse.csrfToken);
    const request = fetchMock.mock.calls[0];
    expect(request?.[0]).toBe("/api/v1/store/customer/logout");
    const options = request?.[1];
    expect(options?.credentials).toBe("include");
    expect(options?.method).toBe("POST");
    expect((options?.headers as Headers).get("X-CSRF-Token")).toBe(sessionResponse.csrfToken);
  });

  it("authenticates with Google credential and returns session", async () => {
    const googleSession = {
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        fullName: "منى أحمد",
        email: "mona@example.com",
        phone: null,
      },
      csrfToken: "csrf-token-with-sufficient-length-123456",
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(googleSession)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loginWithGoogle("valid-mock-google-id-token")).resolves.toEqual(googleSession);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/store/customer/auth/google",
      expect.objectContaining({
        cache: "no-store",
        credentials: "include",
        method: "POST",
        body: JSON.stringify({ credential: "valid-mock-google-id-token" }),
      }),
    );
  });

  it("maps Google authentication failures to user-facing account errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "GOOGLE_AUTH_FAILED" },
    }), { status: 401 })));

    await expect(loginWithGoogle("invalid-token")).rejects.toEqual(new CustomerAuthError("googleAuthFailed"));

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "GOOGLE_EMAIL_UNVERIFIED" },
    }), { status: 403 })));

    await expect(loginWithGoogle("unverified-email-token")).rejects.toEqual(new CustomerAuthError("googleEmailUnverified"));
  });
});
