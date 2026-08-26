# Data governance

## Classification

| Class        | Examples                                                                                        | Handling                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Public       | Approved product facts, prices, published translations, licensed public renditions, policies    | Public projection only; publication and rights gates apply                           |
| Internal     | SKU workflows, queue counts, release evidence, provider modes, non-sensitive business settings  | Staff least privilege; no public projection                                          |
| Confidential | Buyer identity/contact/address, order support context, private evidence, staff invitation email | Purpose-limited access, encryption in transit/at rest, bounded export, redacted logs |
| Restricted   | Credentials, service keys, payment secrets, Auth factors, raw webhook bodies, database password | Secret manager only; never UI/log/audit/export/source                                |

Payment card data is never collected or stored by ÉPOCA; hosted providers own that boundary. Product rights evidence and return/contact uploads stay private even when an approved rendition is public.

## Retention and deletion

| Data                                       | Initial rule                                                                       | Disposal                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Orders, payments, refunds, financial audit | 7 years or longer if Georgian legal/tax advice requires                            | Restricted archival, then approved deletion          |
| Security audit and access evidence         | 3 years                                                                            | Automated archive/purge by retention class           |
| Standard operational audit                 | 1 year                                                                             | Automated archive/purge                              |
| Privacy request evidence                   | 3 years after closure                                                              | Restricted archival/purge                            |
| Sessions                                   | Revoke on sign-out/role change; purge expired records after the operational window | Scheduled maintenance                                |
| Staff invitations and exports              | Invitations 7 days; exports generally 2 hours                                      | Scheduled expiry plus private-object deletion        |
| Carts/reservations/checkout                | Short business window; release stock at expiry                                     | Scheduled expiry and later minimization              |
| Provider inbox/outbox/job evidence         | Keep through reconciliation and dispute window, then aggregate/archive             | Approved retention job                               |
| Raw product originals and rights evidence  | While product is operated plus rights/dispute need                                 | Archive/delete only after reference and legal review |

Final production periods require Georgian counsel/accountant approval. Until approved, the UI and legal pages must label them unapproved rather than inventing facts.

## Privacy requests

Access, export, correction, and deletion requests require identity verification and one case reference. Exports are scoped, bounded, short-lived, spreadsheet-safe, and private. Deletion is Owner/AAL2-only with exact impact confirmation, a reason, legal-hold/financial-retention evaluation, and auditable outcome. Order snapshots are corrected through linked events or customer master data where legally permitted, never rewritten to erase accepted commercial truth.

## Region, processors, and transfers

Before production, document and approve the Supabase database/Storage region, Netlify processing/CDN footprint, TBC/other payment processor, Resend, optional OpenAI assistance, optional Sentry, optional PostHog, domain/registrar, and support tools. Record purpose, data categories, region/transfer mechanism, retention, DPA, security contact, and disablement path for each. Optional analytics requires consent; operational monitoring remains PII-off and uses safe event names/correlation references.

## Logs and credentials

Logs accept only named events, bounded metric labels, safe error codes, release/environment/route class, durations, pseudonymous references, and correlation IDs. Names, email, phone, address, IP, free text, raw URLs/queries, prompts, payloads, credentials, card data, and provider display errors are prohibited.

Rotate credentials immediately after disclosure, suspected access, staff departure, provider compromise, or according to provider policy; otherwise review at least quarterly. Rotation means create replacement, update secret manager, deploy and verify, revoke old value, inspect failures/audit, and record only the credential class plus completion evidence. The Owner maintains the subprocessors and rotation register outside source control.
