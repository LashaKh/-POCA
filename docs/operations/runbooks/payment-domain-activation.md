# Payment and domain activation

## Hosted payment activation

1. Complete merchant approval in the Georgia-registered entity's name and obtain approved TBC test/live credentials, webhook requirements, supported currencies, refund rules, and settlement contacts.
2. Store credentials only in scoped Netlify/Supabase secret management. Never paste them into source, audit summaries, support tickets, screenshots, or browser-visible variables.
3. Keep `PAYMENT_PROVIDER_MODE=disabled` until sandbox contract tests pass for initiation, return, independent status verification, valid/invalid/duplicate/out-of-order callbacks, timeouts, full/partial refunds, and reconciliation.
4. Run staging with sandbox mode and synthetic orders. Confirm amounts, currency, merchant reference, idempotency, webhook authenticity, notification, refund, and inventory effects.
5. Have the Owner set live mode with AAL2 only after bank transfer remains valid, support can handle uncertain payments, and rollback/deactivation is rehearsed.
6. Run one bounded live transaction and refund, then record evidence. Never use a real buyer as a test subject.

Bank transfer is the launch-safe payment path when its legal beneficiary, bank, IBAN, localized instructions, deadline, staff verification, and reconciliation procedure are approved. Cash on delivery remains disabled.

## Domain and email activation

1. Confirm the final domain owner, registrar access, canonical host, Georgian business identity, legal pages, support address, and privacy contact.
2. Add the domain to Netlify, verify DNS, set the canonical `SITE_URL`, redirect alternate hosts to the canonical HTTPS host, and wait for TLS to be active.
3. Add the final origin and callback URLs to Supabase Auth. Remove unused preview callbacks from production.
4. Configure SPF, DKIM, and DMARC for the approved sending domain; verify Resend webhook signing and bounce/suppression handling.
5. Set `DOMAIN_ACTIVATION_REFERENCE` and related evidence only after HTTPS, redirects, Auth recovery, email, sitemap, robots, structured data, and all four locales pass staging smoke.
