/**Stripe Webhook Test Script
 *
 *tests the webhook handler by triggering Stripe CLI events and verifying
 *database state changes. Requires:
 *  1. Stripe CLI installed (https://stripe.com/docs/stripe-cli)
 *  2. Dev server running at localhost:3000
 *  3. DATABASE_URL set in .env.local
 *
 *## Quick Start
 *
 *Terminal 1 — forward events to your local webhook:
 *  stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *
 *Terminal 2 — run individual event tests:
 *  stripe trigger checkout.session.completed
 *  stripe trigger customer.subscription.updated
 *  stripe trigger customer.subscription.deleted
 *  stripe trigger invoice.payment_succeeded
 *  stripe trigger invoice.payment_failed
 *  stripe trigger customer.subscription.paused
 *
 *## Full Lifecycle Test (run in order):
 *
 *  # 1. Create a new subscription via checkout (test card: 4242 4242 4242 4242)
 *  stripe trigger checkout.session.completed --add checkout_session:metadata[userId]=test-user-123 --add checkout_session:metadata[planId]=PRO --add checkout_session:mode=subscription
 *
 *  # 2. Simulate a renewal payment
 *  stripe trigger invoice.payment_succeeded
 *
 *  # 3. Simulate a failed payment
 *  stripe trigger invoice.payment_failed
 *
 *  # 4. Simulate subscription pause
 *  stripe trigger customer.subscription.paused
 *
 *  # 5. Simulate subscription update (e.g. reactivation)
 *  stripe trigger customer.subscription.updated
 *
 *  # 6. Simulate subscription deletion/cancellation
 *  stripe trigger customer.subscription.deleted
 *
 *## Verify DB State
 *
 *after each event, check the database:
 *  npx prisma studio
 *
 *or query directly:
 *  psql $DATABASE_URL -c "SELECT id, type, \"processedAt\" FROM \"StripeEvent\" ORDER BY \"createdAt\" DESC LIMIT 10;"
 *  psql $DATABASE_URL -c "SELECT plan, \"reportsUsed\", \"reportsLimit\" FROM \"User\" WHERE id = 'test-user-123';"
 *  psql $DATABASE_URL -c "SELECT status, \"cancelAtPeriodEnd\" FROM \"Subscription\" WHERE \"userId\" = 'test-user-123';"
 *
 *## Expected State Transitions
 *
 *| Event                              | User.plan | User.reportsUsed | Subscription.status | Notes                              |
 *|------------------------------------|-----------|------------------|---------------------|------------------------------------|
 *| checkout.session.completed (PRO)   | PRO       | 0                | ACTIVE              | reportsLimit → 100                 |
 *| checkout.session.completed (PPR)   | PER_REPORT| unchanged        | n/a                 | reportsLimit += 1                  |
 *| invoice.payment_succeeded (cycle)  | PRO       | 0                | ACTIVE              | Monthly reset                      |
 *| invoice.payment_failed             | unchanged | unchanged        | PAST_DUE            | Grace period email sent            |
 *| customer.subscription.paused       | unchanged | unchanged        | PAUSED              | No report generation allowed       |
 *| customer.subscription.updated      | varies    | unchanged        | varies              | Maps Stripe status to DB enum      |
 *| customer.subscription.deleted      | FREE      | 0                | CANCELED            | reportsLimit → 1                   |
 *
 *## Idempotency Test
 *
 *the webhook handler logs events to the StripeEvent table and skips duplicates.
 *to test:
 *  1. Trigger an event: stripe trigger checkout.session.completed
 *  2. Note the event ID from the Stripe CLI output
 *  3. Resend it: stripe events resend evt_XXXX
 *  4. Check logs — should see "Duplicate event skipped"
 *  5. Verify StripeEvent table has only 1 row for that event ID
 *
 *## End-to-End Browser Test
 *
 *for a full checkout flow with test card:
 *  1. Start dev: npm run dev
 *  2. Start listener: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *  3. Sign up / log in at localhost:3000
 *  4. Go to /pricing, click "Get Pro"
 *  5. In Stripe Checkout, use test card: 4242 4242 4242 4242
 *  6. Any future expiry, any CVC, any billing ZIP
 *  7. After success redirect, verify:
 *     - Dashboard shows "Pro" plan
 *     - Report limit is 100
 *     - Subscription table has ACTIVE status
 *     - StripeEvent table has checkout.session.completed entry*/

export {};
