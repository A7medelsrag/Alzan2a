import { afterEach, describe, expect, it, vi } from "vitest";
import { updateAdminVariantStock } from "./management";

const csrfToken = "csrf-token-with-sufficient-length-123456";

afterEach(() => vi.unstubAllGlobals());

describe("admin management API", () => {
  it("loads the admin CSRF token and sends it with inventory updates", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "variant-id", stockQuantity: 4 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await updateAdminVariantStock("variant-id", 4, "Physical stock count");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({});
    const headers = new Headers(fetchMock.mock.calls[1][1]?.headers);
    expect(headers.get("X-CSRF-Token")).toBe(csrfToken);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ stockQuantity: 4, reason: "Physical stock count" });
  });

  it("surfaces an expired admin session instead of sending a mutation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateAdminVariantStock("variant-id", 4, "Physical stock count"))
      .rejects.toMatchObject({ code: "ADMIN_UNAUTHENTICATED", statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
