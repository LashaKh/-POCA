import type { ActorContext, StaffActorContext } from "./context";

export class AuthorizationError extends Error {
  constructor(
    readonly code:
      | "AUTH_REQUIRED"
      | "FORBIDDEN"
      | "MFA_REQUIRED"
      | "SESSION_REVOKED",
  ) {
    super(code);
    this.name = "AuthorizationError";
  }
}

export function requireAuthenticated(context: ActorContext) {
  if (context.kind === "anonymous" || context.kind === "guest") {
    throw new AuthorizationError("AUTH_REQUIRED");
  }

  if (context.sessionState !== "active") {
    throw new AuthorizationError("SESSION_REVOKED");
  }

  return context;
}

export function requireManager(context: ActorContext): StaffActorContext {
  const authenticated = requireAuthenticated(context);

  if (authenticated.kind !== "staff" || !authenticated.active) {
    throw new AuthorizationError("FORBIDDEN");
  }

  return authenticated;
}

export function requireOwner(context: ActorContext): StaffActorContext {
  const staff = requireManager(context);

  if (staff.role !== "owner") {
    throw new AuthorizationError("FORBIDDEN");
  }

  return staff;
}

export function canBypassLocalOwnerMfa(context: ActorContext) {
  return (
    process.env.DEPLOY_ENV === "local" &&
    context.kind === "staff" &&
    context.role === "owner" &&
    context.active &&
    context.email?.toLowerCase().endsWith("@epoca.local") === true
  );
}

export function requireOwnerAssurance(
  context: ActorContext,
): StaffActorContext {
  const owner = requireOwner(context);
  if (!canBypassLocalOwnerMfa(owner)) requireAssurance(owner, "aal2");
  return owner;
}

export function requireAssurance(
  context: ActorContext,
  level: "aal1" | "aal2",
) {
  const authenticated = requireAuthenticated(context);

  if (level === "aal2" && authenticated.assuranceLevel !== "aal2") {
    throw new AuthorizationError("MFA_REQUIRED");
  }

  return authenticated;
}
