import type { Metadata } from "next";
import { Noto_Sans_KR, Inter } from "next/font/google"; // Inter font added
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "MediPoster",
  description: "MediPoster - AI Automated Blogging Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${notoSansKr.variable} ${inter.variable} antialiased font-sans`}
      >
        {children}
        <SpeedInsights />
        <Script src="https://lite.payapp.kr/public/api/v2/payapp-lite.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
