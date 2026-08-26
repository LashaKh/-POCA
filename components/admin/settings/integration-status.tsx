type Integration = {
  key: string | null;
  mode: "disabled" | "fixture" | "sandbox" | "live" | "degraded" | null;
  capabilities: string[] | null;
  safe_reason: string | null;
  secret_configured: boolean | null;
  last_checked_at: string | null;
  updated_at: string | null;
};

export function integrationReadiness(integration: Integration) {
  if (integration.mode === "disabled") return "Disabled";
  if (!integration.secret_configured) return "Needs configuration";
  if (integration.safe_reason) return "Degraded";
  if (integration.mode === "fixture" || integration.mode === "sandbox")
    return "Test only";
  return "Ready";
}

export function IntegrationStatus({
  integrations,
}: {
  integrations: Integration[];
}) {
  return (
    <div className="admin-card-grid">
      {integrations.map((integration) => (
        <article className="admin-card" key={integration.key}>
          <span className="eyebrow">{integrationReadiness(integration)}</span>
          <strong>{integration.key}</strong>
          <span>Mode: {integration.mode}</span>
          <span>
            Credential stored: {integration.secret_configured ? "yes" : "no"}
          </span>
          <span>
            {integration.safe_reason ?? "No provider issue reported."}
          </span>
          <small>
            {(integration.capabilities ?? []).join(" · ") ||
              "No capabilities enabled"}
          </small>
        </article>
      ))}
    </div>
  );
}
