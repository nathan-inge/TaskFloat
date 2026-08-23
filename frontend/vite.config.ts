import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Contextual Task Organizer',
        short_name: 'TODO',
        description: 'Personal task manager with GTD contexts and Slack Time prioritization.',
        theme_color: '#1e88e5',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      // 127.0.0.1, not localhost: on macOS, Node resolves `localhost` to ::1
      // first, and AirPlay Receiver (ControlCenter) also listens on *:5000 —
      // it answers proxied API calls with a bare 403. The backend binds IPv4
      // loopback, so addressing it directly keeps dev off AirPlay's port.
      '/api': 'http://127.0.0.1:5000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
