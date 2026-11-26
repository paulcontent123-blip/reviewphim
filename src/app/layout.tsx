import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/components/AuthProvider";
import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { usingSample } from "@/lib/data";
import { isIndexable, siteUrl } from "@/lib/env";
import "./globals.css";

const body = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const display = Playfair_Display({ subsets: ["latin", "vietnamese"], weight: ["700"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ReviewPhim.vn - Review & Đánh giá phim", template: "%s | ReviewPhim.vn" },
  description: "Review phim tiếng Việt, điểm đánh giá từ người xem và gợi ý nơi xem phim có bản quyền.",
  openGraph: { siteName: "ReviewPhim.vn", locale: "vi_VN", type: "website" },
  robots: isIndexable ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#FAF8F5" };

const ga = process.env.NEXT_PUBLIC_GA4_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <AuthProvider />
        {usingSample() && (
          <p className="bg-crimson px-4 py-1.5 text-center text-xs font-medium text-white">
            Đang chạy dữ liệu mẫu. Điền .env.local để nối Supabase.
          </p>
        )}
        <NavBar />
        <main className="flex-1">{children}</main>
        <Footer />
        {ga && /^G-[A-Z0-9]+$/.test(ga) && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}')`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
