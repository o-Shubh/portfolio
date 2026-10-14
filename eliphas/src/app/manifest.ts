import type { MetadataRoute } from "next";

/** Lets Android and iPhone install the site as an app on the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Eliphas Indicus Publications",
    short_name: "Eliphas",
    description: "Publish your book in print across India, and buy Hindi and English books by Indian authors.",
    lang: "en-IN",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f7",
    theme_color: "#17214a",
    categories: ["books", "education", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Bookstore", url: "/books", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My account", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Publish a book", url: "/author/books/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
