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
  title: {
    default: "ScopePipe",
    template: "%s · ScopePipe",
  },
  description:
    "Mobile-first painting estimates and a four-stage job pipeline. $49 a month.",
};

export const viewport: Viewport = {
  themeColor: "#f4efe4",
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
