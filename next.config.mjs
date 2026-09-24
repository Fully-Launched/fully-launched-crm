/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Marketplace branch was renamed to Ecommerce (migration 008); keep old
  // bookmarks and links working. Query string (?view=table) is carried over.
  async redirects() {
    return [
      {
        source: "/projects/marketplace",
        destination: "/projects/ecommerce",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
