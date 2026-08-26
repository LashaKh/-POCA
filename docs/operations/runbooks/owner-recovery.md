# Owner access recovery

## Normal recovery

1. Use the generic recovery form from a trusted device. The response never confirms whether an account exists.
2. Open the short-lived link on the same trusted origin, choose a new unique password of at least 14 characters, and sign in again.
3. Complete TOTP. Review active sessions and revoke every session that is not recognized.

## Lost authenticator or suspected compromise

1. Use a second enrolled factor or a previously prepared offline recovery procedure. Do not ask a Manager to bypass MFA; Managers cannot change ownership or Owner factors.
2. If no factor remains, a designated organization administrator uses the Supabase Dashboard under two-person verification to recover the Auth user. Record only safe action metadata and the incident reference.
3. Re-enroll TOTP, rotate the password, revoke all application/Auth sessions, rotate affected API/provider credentials, and inspect security/audit events from before and after the incident.
4. Confirm at least one active Owner remains. The database prevents deactivating or demoting the last active Owner.

## Preparedness

Maintain two named active Owners before launch, each with MFA and tested recovery, but do not share accounts or factors. Keep provider/registrar/Supabase/Netlify recovery ownership in the business continuity register and test this runbook twice yearly.
