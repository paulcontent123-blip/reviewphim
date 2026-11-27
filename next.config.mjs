/** @type {import('next').NextConfig} */
const nextConfig = {
  // Chưa bật tối ưu ảnh: ảnh TMDB đã có sẵn nhiều kích thước, bật lên tốn hạn mức Vercel. Xét riêng sau.
  images: { unoptimized: true },
  // Không để next dev tự tạo AGENTS.md ở gốc dự án.
  agentRules: false,
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
