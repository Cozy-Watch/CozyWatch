export const TRUSTED_IMAGE_HOSTS = [
  "github.com",
  "avatars.githubusercontent.com",
  "raw.githubusercontent.com",
  "media.githubusercontent.com",
  "user-images.githubusercontent.com",
  "private-user-images.githubusercontent.com",
  "objects.githubusercontent.com",
  "camo.githubusercontent.com",
] as const;

export const isTrustedImageUrl = (value: string) => {
  if (!value.trim()) return false;
  try {
    const url = new URL(value, "https://github.com");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      TRUSTED_IMAGE_HOSTS.some((host) => host === url.hostname)
    );
  } catch {
    return false;
  }
};

export const getContentSecurityPolicy = (isDevelopment: boolean) => {
  const images = TRUSTED_IMAGE_HOSTS.map((host) => `https://${host}`).join(" ");
  const scripts = isDevelopment
    ? "'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:*"
    : "'self'";
  const connections = isDevelopment
    ? "'self' ws: http://localhost:* http://127.0.0.1:*"
    : "'self'";
  return `default-src 'self'; script-src ${scripts}; connect-src ${connections} https://api.github.com https://api.lemonsqueezy.com; img-src 'self' data: ${images}; style-src 'self' 'unsafe-inline'; font-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none';`;
};
