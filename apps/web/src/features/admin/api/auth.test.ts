import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAuthError, loginAdmin, logoutAdmin, verifyAdminSession } from "./auth";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin authentication requests", () => {
  it("uses the server session cookie and treats an anonymous session as unauthenticated", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyAdminSession()).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/auth/me",
      expect.objectContaining({ cache: "no-store", credentials: "include", method: "GET" }),
    );
  });

  it("reports API connection failures instead of granting admin access", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(verifyAdminSession()).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("does not accept a login response unless the server confirms the session", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loginAdmin("admin", "example-password", "123456")).rejects.toMatchObject(
      new AdminAuthError("invalid"),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/admin/auth/login",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "example-password", mfaCode: "123456" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/admin/auth/me",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
  });

  it("omits an empty optional MFA code from the login payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loginAdmin("admin", "example-password", "")).rejects.toMatchObject({
      kind: "invalid",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "example-password" }),
      }),
    );
  });

  it("does not accept credentials when the authentication server is unavailable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loginAdmin("admin", "example-password", "")).rejects.toMatchObject({
      kind: "unavailable",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reports a rejected browser origin separately from a connection failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

    await expect(loginAdmin("admin", "example-password", "")).rejects.toMatchObject({
      kind: "origin",
    });
  });

  it("sends the admin CSRF token when ending a session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(logoutAdmin("csrf-value")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/auth/logout",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        headers: { "X-CSRF-Token": "csrf-value" },
      }),
    );
  });
});
