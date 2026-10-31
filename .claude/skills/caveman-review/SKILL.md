# caveman-review

Compressed code review - one line per finding with location, problem and fix. Use for /caveman-review, "review this PR", or "review the diff".

## When to Use
- Code reviews
- PR reviews
- Diff reviews
- Finding issues

## Format
```
<file>:<line> - <problem> → <fix>
```

## Example
```
src/auth.ts:42 - Missing input validation → Add zod schema
src/db.ts:15 - SQL injection risk → Use parameterized queries
src/api.ts:89 - No rate limiting → Add express-rate-limit
```

## Output
- One line per finding
- Location with file and line
- Problem description
- Suggested fix