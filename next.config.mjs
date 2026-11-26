/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image Optimizer của Next 14 có lỗ hổng không còn được vá (GHSA-2xp9-vwfh-vxw4, GHSA-2464-fhr4-w9xw).
  // Giữ unoptimized cho tới khi nâng Next. Ảnh TMDB đã có sẵn nhiều kích thước.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
