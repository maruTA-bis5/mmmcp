import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globalSetup: 'test/integration/globalSetup.ts',
        include: ['test/integration/**/*.test.ts'],
    },
});
