import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      'next/link': path.resolve(import.meta.dirname, './src/compat/next-link.tsx'),
      'next/navigation': path.resolve(import.meta.dirname, './src/compat/next-navigation.ts'),
      'next/dynamic': path.resolve(import.meta.dirname, './src/compat/next-dynamic.tsx'),
      '@': path.resolve(import.meta.dirname, './'),
    },
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
    host: true,
  },
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
});
