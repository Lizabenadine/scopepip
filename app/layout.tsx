import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { RootBoundary } from "@/components/shell/root-boundary";
import { ReferralTracker } from "@/components/affiliates/referral-tracker";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://scopepipe.com"),
  title: {
    default: "Scopepipe | Painting, Drywall & Flooring Contractor Estimating Software",
    template: "%s | Scopepipe",
  },
  description:
    "Estimating, proposals, and bilingual crew sheets for painting, drywall, and flooring contractors. Measure rooms, build bids, attach video walkthroughs, and share work orders in English or Spanish.",
  icons: {
    icon: [
      { url: "/scopepipe-tab.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/scopepipe-mark-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ReferralTracker />
        <RootBoundary>{children}</RootBoundary>
      </body>
    </html>
  );
}
