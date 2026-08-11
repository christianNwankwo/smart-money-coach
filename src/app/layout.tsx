import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MarketProvider } from "@/components/MarketContext";
import { marketConfig } from "@/market";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s · Smart Money Coach",
    default: "Smart Money Coach — Mortgage, debt & refinance calculators",
  },
  description:
    "Free mortgage calculator, debt payoff planner, and refinance break-even analysis. Every figure is computed in your browser — nothing is ever uploaded.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "Smart Money Coach",
    description:
      "Free mortgage calculator, debt payoff planner, and refinance break-even analysis.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <MarketProvider>{children}</MarketProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  );
}
