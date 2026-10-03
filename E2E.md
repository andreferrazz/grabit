# End-to-end test catalog

Grabit has no unit tests. Every behaviour is covered by a Playwright test in `e2e/`,
and every test is listed here. Add, change or remove a row in the same commit as the spec.

Each test runs twice: once in the `desktop` project (Desktop Chrome) and once in the
`phone` project (Pixel 7). Tests run against the production build, a throwaway
Postgres and a mail catcher (`compose.test.yaml`); the setup refuses any database whose name does not end in `_test`.

```sh
npm run test:db    # start the test database
npm run test:e2e   # build and run every test
```

| ID      | Spec                         | Test                                                                           | What it proves                                                                                     | Added in |
| ------- | ---------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------- |
| E2E-001 | `e2e/auth.spec.ts`           | sign up creates an account and starts a session                                | A new visitor can register with name, email and password and lands signed in on Lists.             | 0.7      |
| E2E-002 | `e2e/auth.spec.ts`           | sign out ends the session and sign in restores it                              | Signing out removes access to signed-in pages, and the same email and password sign back in.       | 0.7      |
| E2E-003 | `e2e/auth.spec.ts`           | sign in with a wrong password is refused                                       | A wrong password shows an error, keeps the typed email, and does not start a session.              | 0.7      |
| E2E-004 | `e2e/auth.spec.ts`           | a signed-out visitor is sent to sign in and back to the page they asked for    | Protected pages redirect to sign-in and return to the requested page afterwards.                   | 1.5      |
| E2E-005 | `e2e/auth.spec.ts`           | sign up with an email that already has an account is refused                   | A second account cannot be created for the same email.                                             | 1.4      |
| E2E-006 | `e2e/auth.spec.ts`           | a signed-in user is sent away from the sign-in page                            | Signed-in users are redirected from sign-in to Lists.                                              | 1.4      |
| E2E-007 | `e2e/auth.spec.ts`           | sign up, sign out and sign in work as plain form posts                         | With JavaScript off, the auth forms work as server-rendered form posts.                            | 1.4      |
| E2E-008 | `e2e/password-reset.spec.ts` | password reset by email replaces the password                                  | The reset email arrives with a link; the new password works and the old one stops working.         | 1.7      |
| E2E-009 | `e2e/password-reset.spec.ts` | a reset request for an unknown address looks the same and sends nothing        | The reset form does not reveal whether an address has an account, and no mail is sent.             | 1.7      |
| E2E-010 | `e2e/password-reset.spec.ts` | a reset link with a bad token is refused                                       | An invalid or expired reset token cannot change a password.                                        | 1.7      |
| E2E-011 | `e2e/shell.spec.ts`          | the navigation reaches Lists, Templates and Settings and marks the current one | The main navigation works on desktop (sidebar) and phone (bottom tabs) and marks the current page. | 1.6      |
| E2E-012 | `e2e/shell.spec.ts`          | too many sign-in attempts from one address are blocked                         | The eleventh sign-in attempt from one address within five minutes is refused.                      | 1.8      |
| E2E-013 | `e2e/shell.spec.ts`          | the health endpoint reports ok when the database answers                       | `/healthz` returns 200 and `{status: ok}` when the database is reachable.                          | 1.9      |
