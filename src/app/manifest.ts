import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumo",
    short_name: "Lumo",
    description: "音声日記AI のモバイル向け MVP",
    start_url: "/",
    display: "standalone",
    background_color: "#E0E0E0",
    theme_color: "#4A9D6E",
    lang: "ja",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

