export type MonitoringInput = {
  correlationId: string;
  event: string;
  error: unknown;
  safeErrorCode: string;
  metadata?: Record<string, unknown>;
};

export type MonitoringEnvelope = {
  eventId: string;
  timestamp: string;
  correlationId: string;
  event: string;
  safeErrorCode: string;
  error: unknown;
  metadata: unknown;
  release?: string;
  environment?: string;
};

export type MonitoringAdapter = {
  privacy: {
    sendDefaultPii: false;
    includeRequestBody: false;
    includeUser: false;
  };
  capture(input: MonitoringInput): Promise<{ accepted: boolean }>;
  captured(): readonly MonitoringEnvelope[];
};

export const monitoringPrivacy = {
  sendDefaultPii: false,
  includeRequestBody: false,
  includeUser: false,
} as const;
