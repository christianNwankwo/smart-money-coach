import type { NextConfig } from "next";

/**
 * Static export. There is no server: every calculation in this app runs in the
 * browser from numbers the visitor typed, so nothing needs a request-time
 * runtime and the whole site is a folder of HTML.
 *
 * `trailingSlash` makes each route emit `<route>/index.html` rather than
 * `<route>.html`, which is the form every static host serves correctly without
 * a rewrite rule. Without it, hosts that do not try `$uri.html` return 404 on
 * deep links.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
