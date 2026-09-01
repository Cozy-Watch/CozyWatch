import { redactDiagnosticValue } from "../security/redactDiagnosticValue";

const MAX_ATTRIBUTE_LENGTH = 500;
const SENSITIVE_KEY = /(authorization|token|license|password|secret|cookie)/i;

export type DiagnosticValue =
  | boolean
  | number
  | string
  | null
  | DiagnosticValue[]
  | { [key: string]: DiagnosticValue };

const sanitizeValue = (value: unknown): DiagnosticValue => {
  if (typeof value === "string") {
    return redactDiagnosticValue(value).slice(0, MAX_ATTRIBUTE_LENGTH);
  }

  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(sanitizeValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).slice(0, 30).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[redacted]" : sanitizeValue(nestedValue),
      ]),
    );
  }

  return String(value).slice(0, MAX_ATTRIBUTE_LENGTH);
};

export const sanitizeDiagnosticAttributes = (
  attributes: Record<string, unknown>,
): Record<string, DiagnosticValue> =>
  Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[redacted]" : sanitizeValue(value),
    ]),
  );
