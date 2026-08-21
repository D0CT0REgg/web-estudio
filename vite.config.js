import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Web estudio",
        short_name: "Web estudio",
        description: "Organiza tus sesiones de estudio, tareas, descansos y simulacros de examen.",
        lang: "es",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#e9f2e3",
        theme_color: "#7c9473",
        icons: [
          { src: "img/pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "img/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "img/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "img/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // El bundle de la app se precachea entero (instala offline al momento). Los audios de
        // Ambiente (varios MB cada uno) se cachean bajo demanda la primera vez que se reproducen,
        // no en la instalación, para no disparar la descarga inicial.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith(".mp3"),
            handler: "CacheFirst",
            options: {
              cacheName: "ambient-audio",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
