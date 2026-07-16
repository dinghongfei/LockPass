import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LockPass",
  description: "Self-hosted password manager",
};

const localeBootScript = `
(function () {
  try {
    var key = ${JSON.stringify(LOCALE_STORAGE_KEY)};
    var stored = localStorage.getItem(key);
    var locale = stored;
    if (locale !== "en" && locale !== "zh-CN") {
      var nav = (navigator.language || "").toLowerCase();
      locale = nav.indexOf("zh") === 0 ? "zh-CN" : "en";
    }
    document.documentElement.lang = locale;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
