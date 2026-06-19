import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['src/test/globalSetup.ts'],
    setupFiles: ['src/test/setupEnv.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: 'forks',
    // All test files share one on-disk SQLite database (see globalSetup.ts).
    // Workspace/Board/Column/Card rows now reference User with an ON DELETE
    // RESTRICT foreign key, so a `beforeEach` in one file (e.g. a plain
    // `user.deleteMany()`) can fail if another file's fixtures still
    // reference that user. Running files sequentially avoids that race.
    fileParallelism: false,
  },
});
