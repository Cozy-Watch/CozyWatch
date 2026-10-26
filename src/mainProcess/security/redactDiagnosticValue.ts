export const redactDiagnosticValue = (value: string) =>
  value
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, "[redacted]")
    .replace(/(\bBearer\s+)[^\s,}"']+/gi, "$1[redacted]")
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, "$1?[redacted]")
    .replace(
      /((?:authorization|token|license(?:[_ -]?key)?|password|secret)\s*[:=]\s*)[^\s,}]+/gi,
      "$1[redacted]",
    );
