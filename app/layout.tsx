import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import { ScopeProvider } from "@/lib/data/store";
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
    default: "Scopepipe | Contractor Estimating & Proposal Software",
    template: "%s | Scopepipe",
  },
  description:
    "Estimating, proposals, and crew sheets for painting contractors. $49 a month. Put a video on the proposal line, and open the crew sheet in English or Spanish.",
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
        <ScopeProvider>
          <AppShell>{children}</AppShell>
        </ScopeProvider>
      </body>
    </html>
  );
}
