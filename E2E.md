# End-to-end test catalog

Grabit has no unit tests. Every behaviour is covered by a Playwright test in `e2e/`,
and every test is listed here. Add, change or remove a row in the same commit as the spec.

Each test runs twice: once in the `desktop` project (Desktop Chrome) and once in the
`phone` project (Pixel 7). Tests run against the production build and a throwaway
Postgres (`compose.test.yaml`); the setup refuses any database whose name does not end in `_test`.

```sh
npm run test:db    # start the test database
npm run test:e2e   # build and run every test
```

| ID      | Spec               | Test                                              | What it proves                                                                                  | Added in |
| ------- | ------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------- |
