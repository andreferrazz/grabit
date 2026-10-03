import { defineConfig, devices } from '@playwright/test';
import { assertTestDatabase, testEnv } from './e2e/env.ts';

assertTestDatabase(testEnv.DATABASE_URL);

const port = 4173;

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.spec.ts',
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://localhost:${port}`,
		// adapter-node assumes https unless a proxy header says otherwise. In production
		// Traefik sends this header; here the tests play the proxy over plain http.
		extraHTTPHeaders: { 'x-forwarded-proto': 'http' },
		trace: 'retain-on-failure'
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'phone', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		// The production build, started with the test environment only.
		command: 'npm run build && node build',
		port,
		reuseExistingServer: false,
		env: { ...testEnv, PORT: String(port), PROTOCOL_HEADER: 'x-forwarded-proto' }
	}
});
