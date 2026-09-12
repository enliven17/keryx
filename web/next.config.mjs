/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Routes navigate through document.startViewTransition, so the old page can
  // cross-fade into the new one instead of being swapped in a single frame.
  experimental: { viewTransition: true },
  // Wallet connectors pull optional dependencies that Next should keep external on the server.
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Optional React-Native-only dep pulled by @metamask/sdk; unused on web.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "@emotion/is-prop-valid": false,
    };
    return config;
  },
};
export default nextConfig;
