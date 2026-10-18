import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Noto_Sans_Devanagari, Noto_Serif_Devanagari, Source_Serif_4 } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

// Interface text uses the device's own sans-serif (San Francisco, Roboto, Segoe UI), set in globals.css.
// Source Serif 4 is only for books and editorial reading. Hindi falls through to the Noto Devanagari fonts.
const serif = Source_Serif_4({ variable: "--font-book-serif", subsets: ["latin"], weight: ["400", "600"], display: "swap", preload: false });
// Mono for IDs (EEID, order numbers) and money columns
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap", preload: false });
const sansDeva = Noto_Sans_Devanagari({ variable: "--font-sans-deva", subsets: ["devanagari"], weight: ["400", "500", "600"], display: "swap", preload: false });
const serifDeva = Noto_Serif_Devanagari({ variable: "--font-serif-deva", subsets: ["devanagari"], weight: ["400", "600"], display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Eliphas Indicus Publications",
    template: "%s — Eliphas Indicus",
  },
  description:
    "Self-publish your book in print. Print on demand, no stock, no upfront cost. You keep your rights and earn on every copy.",
  applicationName: "Eliphas Indicus",
  // iPhone home-screen app: full screen, with the status bar over the app's own colours
  appleWebApp: { capable: true, title: "Eliphas", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1e" },
  ],
};

// Runs before the page paints so a saved light/dark choice doesn't flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${serif.variable} ${sansDeva.variable} ${serifDeva.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-surface focus:px-4 focus:py-3 focus:font-semibold focus:text-fg focus:shadow-lift">
          Skip to content
        </a>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
