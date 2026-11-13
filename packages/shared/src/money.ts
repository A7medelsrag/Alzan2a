import { z } from "zod";

export const piastersSchema = z
  .number()
  .int({ message: "Money must be an integer representing piasters" });

export type Piasters = z.infer<typeof piastersSchema>;

export function assertInteger(value: number, name = "amount"): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer (piasters), received: ${value}`);
  }
}

export function add(a: number, b: number): number {
  assertInteger(a, "First operand");
  assertInteger(b, "Second operand");
  return a + b;
}

export function subtract(a: number, b: number): number {
  assertInteger(a, "First operand");
  assertInteger(b, "Second operand");
  return a - b;
}

export function formatEGP(piasters: number): string {
  assertInteger(piasters, "Piasters");
  const egp = (piasters / 100).toFixed(2);
  return `${egp} ج.م`;
}
