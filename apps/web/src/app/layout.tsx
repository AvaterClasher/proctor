import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const bricolage = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Proctor",
  description: "AI-powered tutor screening",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bricolage.variable} ${figtree.variable} antialiased`}
      >
        <Providers>
          <div className="grid h-svh grid-rows-[auto_1fr]">
            <Header />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
