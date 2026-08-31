export const redactDiagnosticValue = (value: string) =>
  value
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, "$1?[redacted]")
    .replace(
      /((?:authorization|token|license(?:[_ -]?key)?|password|secret)\s*[:=]\s*)[^\s,}]+/gi,
      "$1[redacted]",
    );
