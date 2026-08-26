import process from "node:process";

const values = {
  netlifyCreditsUsed: Number(process.env.NETLIFY_CREDITS_USED ?? 0),
  netlifyCreditsBudget: Number(process.env.NETLIFY_CREDITS_BUDGET ?? 300),
  supabaseEgressGiB: Number(process.env.SUPABASE_EGRESS_GIB ?? 0),
  supabaseEgressBudgetGiB: Number(process.env.SUPABASE_EGRESS_BUDGET_GIB ?? 20),
  monitoringEvents: Number(process.env.MONITORING_EVENTS ?? 0),
  monitoringEventsBudget: Number(process.env.MONITORING_EVENTS_BUDGET ?? 50000),
};
const valid = Object.values(values).every(
  (value) => Number.isFinite(value) && value >= 0,
);
const withinBudget =
  values.netlifyCreditsUsed <= values.netlifyCreditsBudget &&
  values.supabaseEgressGiB <= values.supabaseEgressBudgetGiB &&
  values.monitoringEvents <= values.monitoringEventsBudget;
process.stdout.write(
  `${JSON.stringify({ ...values, withinBudget }, null, 2)}\n`,
);
if (!valid || !withinBudget) process.exitCode = 1;
