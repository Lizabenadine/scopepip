import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
  outputFileTracingIncludes: {
    "/api/proposals/[id]/email/route": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/proposals/[id]/pdf/route": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  async redirects() {
    return [
      { source: "/mark.svg", destination: "/scopepipe-mark.png", permanent: false },
      { source: "/apple-touch-mark.png", destination: "/scopepipe-mark-180.png", permanent: false },
    ]
  },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The dev server advertises localhost. Browsers here open 127.0.0.1,
  // and the public tunnel is a trycloudflare.com host.
  allowedDevOrigins: ["127.0.0.1", "*.trycloudflare.com"],
};

export default nextConfig;
