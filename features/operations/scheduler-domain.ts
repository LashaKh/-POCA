export type ScheduledJobWindow = {
  key: string;
  intervalSeconds: number;
  maxCatchUp: number;
  lastSuccessfulAt: Date;
};

export function planScheduledCatchUp(input: {
  now: Date;
  jobs: readonly ScheduledJobWindow[];
}) {
  const nowMs = input.now.getTime();
  return input.jobs.flatMap((job) => {
    if (
      !Number.isInteger(job.intervalSeconds) ||
      job.intervalSeconds < 1 ||
      !Number.isInteger(job.maxCatchUp) ||
      job.maxCatchUp < 1
    ) {
      throw new Error("INVALID_SCHEDULE");
    }
    const intervalMs = job.intervalSeconds * 1000;
    const missed: number[] = [];
    for (
      let scheduled = job.lastSuccessfulAt.getTime() + intervalMs;
      scheduled <= nowMs;
      scheduled += intervalMs
    ) {
      missed.push(scheduled);
    }
    return missed.slice(-job.maxCatchUp).map((scheduledFor) => ({
      key: job.key,
      scheduledFor: new Date(scheduledFor).toISOString(),
    }));
  });
}
