import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "VEnhance – AI Video Enhancement",
    template: "%s | VEnhance",
  },
  description:
    "Transform low-quality videos into stunning high-resolution content with AI-powered upscaling, denoising, sharpening, and color enhancement.",
  keywords: [
    "AI video enhancement",
    "video upscaling",
    "video quality improvement",
    "4K upscale",
    "video denoising",
    "video sharpening",
  ],
  authors: [{ name: "VEnhance" }],
  creator: "VEnhance",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "VEnhance – AI Video Enhancement",
    description: "Transform your videos with cutting-edge AI technology",
    siteName: "VEnhance",
  },
  twitter: {
    card: "summary_large_image",
    title: "VEnhance – AI Video Enhancement",
    description: "Transform your videos with cutting-edge AI technology",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <div className="relative min-h-screen flex flex-col">
          {/* Global background */}
          <div className="fixed inset-0 -z-10 pointer-events-none">
            <div className="absolute inset-0 bg-[#050507]" />
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-900/20 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-900/15 blur-3xl" />
            <div className="absolute top-1/2 left-0 w-64 h-64 rounded-full bg-violet-800/10 blur-3xl" />
          </div>

          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster
          position="top-right"
          expand={true}
          richColors
          toastOptions={{
            style: {
              background: "rgba(10, 10, 15, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              backdropFilter: "blur(20px)",
            },
          }}
        />
      </body>
    </html>
  );
}
