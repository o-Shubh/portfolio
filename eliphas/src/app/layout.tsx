import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Poppins } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

// One clean, friendly sans for the whole app (marketplace style).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Used only when text contains Devanagari letters (Hindi titles and names).
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

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
    { media: "(prefers-color-scheme: light)", color: "#13223c" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1a33" },
  ],
};

// Runs before the page paints so a saved light/dark choice doesn't flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${devanagari.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
