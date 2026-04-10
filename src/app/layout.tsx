import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mini Games",
  description: "A collection of fun daily mini games",
  openGraph: {
    title: "Mini Games",
    description: "A collection of fun daily mini games",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-[100dvh] bg-[#fafafa] text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
