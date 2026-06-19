import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    // Workspace packages (e.g. @taskflow/shared) are symlinked into
    // node_modules. Without this, Vite/Rollup dereferences the symlink to
    // the real path outside node_modules, so the CommonJS interop plugin's
    // node_modules-scoped matcher skips it and named exports go missing in
    // production builds (dev mode is unaffected since esbuild handles it).
    preserveSymlinks: true,
  },
});
