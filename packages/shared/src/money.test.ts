import { describe, it, expect } from "vitest";
import { add, subtract, formatEGP, piastersSchema } from "./money.js";

describe("Money utility (piasters)", () => {
  describe("add", () => {
    it("adds two integer piaster amounts", () => {
      expect(add(100, 250)).toBe(350);
      expect(add(0, 500)).toBe(500);
      expect(add(1000, 5000)).toBe(6000);
    });

    it("throws an error when float values are passed", () => {
      expect(() => add(10.5, 20)).toThrow(TypeError);
      expect(() => add(10, 20.75)).toThrow(TypeError);
    });
  });

  describe("subtract", () => {
    it("subtracts two integer piaster amounts", () => {
      expect(subtract(500, 200)).toBe(300);
      expect(subtract(200, 500)).toBe(-300);
      expect(subtract(1000, 1000)).toBe(0);
    });

    it("throws an error when float values are passed", () => {
      expect(() => subtract(15.2, 5)).toThrow(TypeError);
      expect(() => subtract(100, 20.99)).toThrow(TypeError);
    });
  });

  describe("formatEGP", () => {
    it("formats integer piasters to EGP string with ج.م", () => {
      expect(formatEGP(100)).toBe("1.00 ج.م");
      expect(formatEGP(1250)).toBe("12.50 ج.م");
      expect(formatEGP(0)).toBe("0.00 ج.م");
      expect(formatEGP(99)).toBe("0.99 ج.م");
      expect(formatEGP(100000)).toBe("1000.00 ج.م");
    });

    it("throws an error if a float is passed", () => {
      expect(() => formatEGP(100.5)).toThrow(TypeError);
    });
  });

  describe("piastersSchema", () => {
    it("validates valid integers", () => {
      expect(piastersSchema.parse(500)).toBe(500);
      expect(piastersSchema.parse(0)).toBe(0);
    });

    it("rejects floats", () => {
      expect(() => piastersSchema.parse(10.5)).toThrow();
    });
  });
});
