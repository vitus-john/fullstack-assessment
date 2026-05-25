# AI Usage Notes

## 1. Tools used

- GitHub Copilot Chat in VS Code for repo inspection, implementation guidance, and note drafting.
- Terminal for running tests, installs, and validation commands.
- VS Code diagnostics and file search to confirm the exact code paths after each edit.

## 2. Prompt journal

### Prompt 1

```
Start from the most concrete anchor available: inspect note.txt, README.md, instruction.md, then the backend and frontend entrypoints before editing anything. Build a short, falsifiable issue map first.
```

What it produced: a narrow read of the repo surface and a concrete shortlist of backend and frontend control paths to inspect next.

What I kept / rejected: I kept the focused inspection order and rejected any broad rewrite plan until I had line-level evidence.

### Prompt 2

```
Fix the backend integrity issues first: order total trust, concurrent stock reservation, payment idempotency, webhook deduplication, and admin authorization. Make the smallest production-appropriate changes and add tests for the highest-risk paths.
```

What it produced: transactional order reservation, advisory-lock payment idempotency, webhook secret enforcement, and admin middleware.

What I kept / rejected: I kept the transaction and lock-based fixes. I rejected any approach that only checked a Redis cache before charging, because that still leaves a race window.

### Prompt 3

```
Fix the frontend state and security problems without introducing a heavy UI framework: search reset, cart persistence, polling cleanup, unsafe HTML rendering, and missing pending/error states.
```

What it produced: effect-driven search with cleanup, persisted cart state, cleaned-up polling, plain-text descriptions, and inline request feedback.

What I kept / rejected: I kept the minimal state fixes and rejected rendering admin content with raw HTML.

### Prompt 4

```
Add one focused frontend regression test that proves the search reset bug is fixed, using the smallest test stack that fits the existing Vite app.
```

What it produced: a Vitest + Testing Library setup and a search-reset regression test.

What I kept / rejected: I kept the small testing stack and rejected a larger UI test matrix because it would not add more signal for the time spent.

## 3. AI got it wrong

One plausible but unsafe suggestion was the money-handling example:

```
const total = price * quantity
```

Why it was wrong: that keeps money in floating-point arithmetic and still trusts client-side totals. I rejected it and moved total computation into the backend transaction, then normalized the value to fixed-precision strings derived from integer cents.

Another unsafe direction was the early idempotency idea of only checking a cache before payment creation. That looks tidy on paper, but it is still race-prone if two requests miss the cache before either writes it. I replaced it with a transaction-scoped advisory lock plus persisted payment reuse.

## 4. Validation strategy

- Ran `npm test` in `backend/` after adding the service and middleware tests.
- Ran `npm test` in `frontend/` after adding the Vitest regression test.
- Used VS Code diagnostics (`get_errors`) after each edit slice to catch type or syntax regressions before running the suites.
- Cross-checked the implementation against the schema, route wiring, and the assessment brief so the fixes matched the actual failure modes.

## 5. What I did NOT delegate

- I did not delegate money handling. The exact place where totals are computed and rounded matters, and AI suggestions here tend to look correct while still being unsafe.
- I did not delegate authorization boundaries. The backend needed explicit admin enforcement, and I wanted that decision anchored to the actual route wiring instead of a generic pattern.
- I did not delegate concurrency control. The reservation and idempotency paths needed transaction ordering, lock scope, and replay behavior that had to be reasoned about directly.
- I did not delegate rendering untrusted input. The product description fix had to remove the HTML execution surface entirely, not just make it look safer.