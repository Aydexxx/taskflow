import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './constants';

/**
 * Runs once before the whole test run, in the main process (not a worker).
 * Pushes the current Prisma schema onto a dedicated test SQLite file so
 * tests never touch the dev database. Uses `db push` (no migration history
 * needed) instead of `migrate dev` since this database is fully disposable.
 */
export default function setup(): void {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
