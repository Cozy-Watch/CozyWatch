import DOMPurify from "dompurify";
import { marked } from "marked";
import { isTrustedImageUrl } from "../../mainProcess/security/contentSecurityPolicy";

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

export const renderSafeMarkdown = (markdown: string) => {
  const fragment = DOMPurify.sanitize(
    marked.parse(markdown, { async: false }) as string,
    {
      RETURN_DOM_FRAGMENT: true,
      FORBID_ATTR: ["style"],
      FORBID_TAGS: FORBIDDEN_MARKDOWN_TAGS,
      USE_PROFILES: { html: true },
    },
  );

  fragment.querySelectorAll("picture source").forEach((source) => source.remove());
  fragment.querySelectorAll("img").forEach((image) => {
    image.removeAttribute("srcset");
    image.setAttribute("referrerpolicy", "no-referrer");
    if (isTrustedImageUrl(image.getAttribute("src") || "")) return;
    const fallback = document.createElement("span");
    fallback.className = "activity-image-fallback";
    fallback.textContent = `Image unavailable: ${image.alt || "attached image"}`;
    image.replaceWith(fallback);
  });
  const template = document.createElement("template");
  template.content.append(fragment);
  return template.innerHTML;
};
