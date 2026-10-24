import { net, protocol } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const APP_RENDERER_URL = "cozy-watch://app/index.html";
export const registerAppScheme = () => protocol.registerSchemesAsPrivileged([
  { scheme: "cozy-watch", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

export const resolveAppResource = (url: string, root: string) => {
  const parsed = new URL(url);
  if (parsed.protocol !== "cozy-watch:" || parsed.hostname !== "app" || parsed.username || parsed.password || parsed.port) throw new Error("Invalid app resource");
  const pathname = decodeURIComponent(parsed.pathname);
  if (pathname.includes("\0") || pathname.includes("\\")) throw new Error("Invalid app path");
  const resolved = path.resolve(root, `.${pathname}`);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error("App resource outside renderer directory");
  return resolved;
};

export const installAppProtocol = (root: string) => protocol.handle("cozy-watch", request => {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  try {
    return net.fetch(pathToFileURL(resolveAppResource(request.url, root)).toString());
  } catch {
    return new Response(null, { status: 404 });
  }
});
