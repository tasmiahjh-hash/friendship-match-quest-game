import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/support/setup.ts'],
    // A developer's .env must not change what the tests see.
    env: { VITE_SUBMISSION_ENDPOINT: 'http://localhost:9/exec', VITE_CONTACT_EMAIL: '', VITE_PRIVACY_CONTACT_EMAIL: '' },
  },
});
