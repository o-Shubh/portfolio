import type { MetadataRoute } from "next";

/** Lets Android and iPhone install the site as an app on the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Eliphas Indicus Publications",
    short_name: "Eliphas",
    description: "Self-publish your book in print, and discover books by independent authors.",
    lang: "en-IN",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Android launch screen: the icon on its own navy
    background_color: "#13223c",
    theme_color: "#ffffff",
    categories: ["books", "education", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Shown in Android's install sheet and used by PWABuilder for the store listing
    screenshots: [
      { src: "/screenshots/phone-home.webp", sizes: "780x1688", type: "image/webp", form_factor: "narrow", label: "Home" },
      { src: "/screenshots/phone-book.webp", sizes: "780x1688", type: "image/webp", form_factor: "narrow", label: "A book page" },
      { src: "/screenshots/phone-dashboard.webp", sizes: "780x1688", type: "image/webp", form_factor: "narrow", label: "Author dashboard" },
      { src: "/screenshots/wide-bookstore.webp", sizes: "1366x860", type: "image/webp", form_factor: "wide", label: "Bookstore" },
    ],
    shortcuts: [
      { name: "Bookstore", url: "/books", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My account", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Publish a book", url: "/author/books/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
