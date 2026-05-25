## Key Observations

### Backend Observations

During testing and code review, I identified several critical integrity and concurrency issues:

* Stock reservation logic could oversell products during concurrent order creation.
* Payment requests could trigger duplicate charges when retried rapidly.
* Payment webhook events were not safely deduplicated.
* Some database operations lacked transactional guarantees.
* Monetary operations relied on unsafe floating-point handling.
* Certain admin operations trusted client input too aggressively.
* Error handling exposed inconsistent API behavior under failure conditions.

## Backend Fixes Implemented

To address these issues, I implemented and validated the following improvements:

* Added transactional stock reservation logic using database locking to prevent overselling.
* Introduced idempotency handling for payment requests using Redis-backed keys.
* Added webhook deduplication safeguards based on provider event IDs.
* Improved retry safety for concurrent payment operations.
* Hardened validation and request sanitization for sensitive routes.
* Improved backend error handling and response consistency.
* Added automated tests covering concurrency, idempotency, and authorization flows.

---

## Frontend Observations

The frontend exposed several state management and UX correctness issues:

* Product and order views could display stale data during polling or navigation.
* Some requests silently failed without surfacing actionable feedback.
* Duplicate submissions were possible during checkout/payment actions.
* Certain components accepted unsafe or unsanitized input.
* Background polling behavior could continue after component unmount.
* UI state occasionally became inconsistent during rapid navigation or refreshes.

## Frontend Fixes Implemented

The following improvements were made:

* Added safer async state handling and request cleanup logic.
* Prevented duplicate form and payment submissions.
* Improved user-visible error handling and loading feedback.
* Added validation and safer rendering behavior for untrusted input.
* Fixed polling cleanup and stale request race conditions.
* Improved admin dashboard state synchronization.
* Added frontend tests for critical state and interaction behavior.

---

# AI-Assisted Development Notes

AI tooling was used primarily for:

* Reviewing concurrency approaches
* Generating alternative implementation patterns
* Drafting test structures
* Cross-checking framework-specific best practices

However, all AI-generated suggestions were manually reviewed and validated before use. Several generated solutions were rejected or rewritten due to unsafe assumptions around concurrency, payment handling, and frontend cleanup behavior.

Particular attention was given to:

* Transaction safety
* Authorization boundaries
* Monetary correctness
* Webhook idempotency
* React lifecycle cleanup
* Preventing stale UI state

---

# Validation Approach

The fixes were verified through:

* Manual concurrency testing
* Integration testing for order/payment flows
* API retry simulations
* Webhook duplication scenarios
* Frontend interaction testing
* Edge-case validation for async UI behavior