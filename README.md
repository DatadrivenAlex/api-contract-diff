# API Contract Diff

A TypeScript portfolio demo: a small, local CLI that flags a narrow set of potentially breaking changes between two JSON OpenAPI descriptions. This is a newly created educational example, not a past client project.

## Why

When a REST API evolves, teams need a quick warning before removing an endpoint or making inputs mandatory. This tool demonstrates typed code, deterministic comparison, CLI exit codes and automated tests without requiring a running server or an API key.

## Run

Requires Node.js 20+. Only JSON documents are supported.

```bash
npm ci
npm test
node dist/cli.js examples/old.json examples/new.json
```

Results are JSON. Exit codes: `0` no detected breaking changes, `1` at least one detected breaking change, `2` usage, parse or file error. The sample intentionally exits `1` because the new version removes a POST operation and a response and adds a required query parameter.

## Checks and limits

For paths and HTTP methods that existed in the old document, the checker flags removed operations, removed response codes, newly required parameters and newly required request bodies. Operation-level inline parameters override path-level parameters by `in` and `name`. Output order is deterministic.

This is not a full OpenAPI validator or compatibility guarantee. It does not compare schemas, enum values, media types, security, response shapes or server behavior. `$ref` objects are not resolved; a warning is emitted when references appear anywhere, and referenced fields can be missed. YAML and OpenAPI extensions are not interpreted. A clean result means only that these limited checks found nothing; review changes manually before release.

## Layout

`src/compare.ts` is the comparison engine; `src/cli.ts` handles JSON files and exit codes. `test/` exercises rules, overrides, reference warnings and CLI exit codes. GitHub Actions tests Node 20 and 22.
