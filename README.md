# Note App API Node

## Develop

Copy `.env.example` to `.env` and adjust ENV VAR values.

Run `npm i` to install project dependencies.

Run `make dev` to start the app.

## Test

Run `make test` or `make test_watch` to run in watch mode.

## Migrations

Migrations are set to the latest version when running `make dev`.

To revert back to a specific version you can run:

```
MIGRATION_VERSION=<version_number> npm run migrations
```

Running `npm run migrations` will migrate to the latest version again.
