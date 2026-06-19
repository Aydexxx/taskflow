import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // See vite.config.ts: workspace packages are symlinked, so named exports
    // from @taskflow/shared would otherwise go missing under Rollup/Vitest's
    // module resolution too.
    preserveSymlinks: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: false,
  },
});
