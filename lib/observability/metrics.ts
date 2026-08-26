export type MetricType = "counter" | "gauge" | "histogram";

type MetricDefinition = {
  type: MetricType;
  labels: readonly string[];
};

const metricDictionary = {
  command_duration_ms: { type: "histogram", labels: ["command", "outcome"] },
  database_conflicts_total: { type: "counter", labels: ["function"] },
  http_errors_total: { type: "counter", labels: ["routeClass", "statusClass"] },
  queue_depth: { type: "gauge", labels: ["queue"] },
  queue_oldest_age_seconds: { type: "gauge", labels: ["queue"] },
  release_outcome_total: { type: "counter", labels: ["stage", "outcome"] },
  scheduler_age_seconds: { type: "gauge", labels: ["job"] },
  worker_duration_ms: { type: "histogram", labels: ["job", "outcome"] },
} as const satisfies Record<string, MetricDefinition>;

export type MetricRecord = {
  name: keyof typeof metricDictionary;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
};

const safeLabelValue = /^[a-zA-Z0-9_.:-]{1,64}$/;

export function recordMetric(input: MetricRecord): MetricRecord {
  const definition = metricDictionary[input.name];
  const labelKeys = Object.keys(input.labels).sort();
  const expectedKeys = [...definition.labels].sort();
  const valid =
    definition.type === input.type &&
    Number.isFinite(input.value) &&
    labelKeys.length === expectedKeys.length &&
    labelKeys.every((key, index) => key === expectedKeys[index]) &&
    Object.values(input.labels).every((value) => safeLabelValue.test(value));

  if (!valid) throw new Error("INVALID_METRIC");
  return {
    name: input.name,
    type: input.type,
    value: input.value,
    labels: { ...input.labels },
  };
}
