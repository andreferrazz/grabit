import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	},
	SMTP_HOST: { description: 'SMTP server host, used for password reset emails.' },
	SMTP_PORT: { description: 'SMTP server port. 465 uses implicit TLS; other ports use STARTTLS.' },
	SMTP_USER: { description: 'SMTP username.' },
	SMTP_PASS: { description: 'SMTP password.' },
	SMTP_FROM: {
		description: 'From address for outgoing mail, e.g. `Grabit <no-reply@example.com>`.'
	}
});
