
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': import.meta.dirname,
      },
    },

    server: {
      // Keep your existing HMR configuration
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},

      // Forward API requests to Namecheap
      proxy: {
        '/aurelia-api': {
          target: 'https://api.ijeshadigitalhub.com',
          changeOrigin: true,
          secure: true,

          // Remove /aurelia-api before forwarding
          rewrite: (path) =>
            path.replace(/^\/aurelia-api/, ''),
        },
      },
    },
  };
});
