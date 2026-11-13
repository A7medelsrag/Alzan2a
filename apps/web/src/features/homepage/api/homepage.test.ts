import { afterEach, describe, expect, it, vi } from "vitest";
import { HomepageRequestError, loadHomepage, saveHomepageBanner } from "./homepage";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("homepage content API", () => {
  it("loads the public configured sections and banners", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { banners: [], sections: [] },
    })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadHomepage()).resolves.toEqual({ banners: [], sections: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/store/homepage",
      expect.objectContaining({ cache: "no-store", credentials: "include" }),
    );
  });

  it("refuses unsafe media URLs before sending admin changes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveHomepageBanner({
      slot: "HERO",
      title: "حملة المتجر",
      desktopImageUrl: "http://images.example.test/banner.jpg",
      overlayColor: "#0A1733",
      overlayOpacity: 35,
      blur: 0,
      isEnabled: true,
      sortOrder: 0,
    }, "csrf-token")).rejects.toBeInstanceOf(HomepageRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
