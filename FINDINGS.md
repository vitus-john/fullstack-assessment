# Findings

I focused on the paths that could corrupt state, leak data, or create confusing UI behavior under retry and concurrency. The fixes below are in the codebase; the remaining gaps are noted where the starter app has no real user-auth model to build on.

## Backend

- Product search used string interpolation in SQL. The search term is now passed as a parameter and escaped for `ILIKE`, which removes the injection risk and makes wildcard characters behave predictably.
- Order creation trusted the client for total amount and item shape. The service now validates product IDs and quantities, computes the total on the server from database prices, and writes the order inside a transaction.
- Stock reservation was not concurrency-safe. Product rows are locked with `FOR UPDATE` before reservation, and the decrement query is guarded with `stock >= quantity` so a stale write fails instead of overselling.
- Payment charging was only idempotent at the Redis-cache layer. The charge path now uses a transaction plus a transaction-scoped advisory lock on the idempotency key, then reuses the persisted payment record if the request is retried.
- Webhook delivery was not deduplicated or authenticated. `provider_event_id` is now unique, the webhook endpoint requires the shared secret header, and duplicate events return success without replaying the order update.
- Admin endpoints were publicly reachable. Admin writes and the admin order list now require `Authorization: Bearer <ADMIN_TOKEN>`.

## Frontend

- Storefront search was reading stale state and not resetting cleanly when the input was cleared. Search now runs from the current query value in an effect with cleanup, so clearing the box restores the full list.
- Cart contents disappeared on refresh. Cart state now hydrates from `localStorage` and is written back on change. Checkout still depends on server-side stock validation, so stale carts can fail safely instead of silently succeeding.
- Order polling leaked intervals. The detail page now clears its timer on unmount and avoids overlapping refresh requests.
- Product descriptions were rendered as raw HTML. They are now rendered as text with preserved line breaks, which removes the XSS surface from admin-editable content.
- Checkout and payment actions had no clear pending or error states. Buttons are now disabled while requests are in flight and failures are shown inline instead of disappearing into the console.
- The admin surface was missing create-product support and used unstable list keys. The page now includes product creation, uses stable IDs for list rendering, and only updates the local list after the server confirms a save.

## Trade-offs

- Customer ownership checks for order detail reads are still not implemented because the app has no customer authentication flow. I left that boundary explicit in the notes rather than pretending the current demo auth is enough.
- Money is still stored as decimal values in PostgreSQL, but the service now computes totals server-side and carries them through as fixed-precision strings. Moving to minor units everywhere would be stronger, but it is not required for this starter.
- I chose inline error text over a toast system. That keeps the dependency footprint small and still makes failures visible, but a shared notification layer would be a reasonable next step in a larger app.

## Verification

- Added backend tests for server-side order totals, idempotent payment replay, webhook deduplication, and admin authorization.
- Added a frontend regression test proving the storefront search resets back to the full product list after clearing the input.
- Re-ran `npm test` in both `backend/` and `frontend/` after the final edits.