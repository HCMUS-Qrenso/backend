import { defineConfig, env } from 'prisma/config';
import 'dotenv/config';

/**
 * Prisma 7 Configuration
 * 
 * In Prisma 7, the datasource URL is removed from both:
 * - schema.prisma (no `url` property in datasource block)
 * - prisma.config.ts (connection URL passed to adapter in runtime)
 * 
 * This config is used for migrations and CLI commands.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
