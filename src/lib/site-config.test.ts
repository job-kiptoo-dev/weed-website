import { describe, expect, it } from "vitest";
import { describeStore, siteConfig } from "./site-config";

describe("describeStore", () => {
  it("mentions accessories, glassware, flower and pre-rolls while smokable hemp is on", () => {
    expect(describeStore({ smokableHemp: true })).toBe(
      "Small-batch hemp-derived CBD tinctures, gummies, topicals and teas, plus smoking accessories, glassware, hemp flower and pre-rolls. Third-party lab tested and labeled by strength and spectrum.",
    );
  });

  it("keeps glassware but drops flower and pre-rolls while smokable hemp is off", () => {
    const description = describeStore({ smokableHemp: false });
    expect(description).toBe(
      "Small-batch hemp-derived CBD tinctures, gummies, topicals and teas, plus smoking accessories and glassware. Third-party lab tested and labeled by strength and spectrum.",
    );
    expect(description.toLowerCase()).not.toContain("pre-roll");
    expect(description.toLowerCase()).not.toContain("flower");
  });

  it("uses the current flags for siteConfig.description", () => {
    expect(siteConfig.description).toBe(describeStore(siteConfig.features));
  });
});

describe("siteConfig contact details", () => {
  it("uses the placeholder brand domain and handles", () => {
    expect(siteConfig.contact.email).toBe("hello@botanicssupply.example");
    expect(siteConfig.social.map((link) => link.href)).toEqual([
      "https://instagram.com/botanicssupplyco",
      "https://tiktok.com/@botanicssupplyco",
    ]);
  });
});
