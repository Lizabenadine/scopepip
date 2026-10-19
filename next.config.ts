import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server advertises localhost. Browsers here open 127.0.0.1,
  // and the public tunnel is a trycloudflare.com host.
  allowedDevOrigins: ["127.0.0.1", "*.trycloudflare.com"],
};

export default nextConfig;
