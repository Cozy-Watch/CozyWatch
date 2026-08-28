import DOMPurify from "dompurify";
import { marked } from "marked";

const FORBIDDEN_MARKDOWN_TAGS = [
  "button",
  "embed",
  "form",
  "iframe",
  "input",
  "object",
  "option",
  "select",
  "style",
  "textarea",
];

export const renderSafeMarkdown = (markdown: string) =>
  DOMPurify.sanitize(marked.parse(markdown, { async: false }) as string, {
    FORBID_ATTR: ["style"],
    FORBID_TAGS: FORBIDDEN_MARKDOWN_TAGS,
    USE_PROFILES: { html: true },
  });
