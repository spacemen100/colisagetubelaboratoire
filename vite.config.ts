import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Port personnalisé (optionnel)
    strictPort: true, // Empêche Vite de changer de port automatiquement
  },
  build: {
    outDir: 'dist', // Dossier de build
  },
});