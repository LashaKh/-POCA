const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3020";
const iterations = Number(process.env.ITERATIONS ?? 40);
const concurrency = Number(process.env.CONCURRENCY ?? 8);
const maximumP95Ms = Number(process.env.MAX_P95_MS ?? 1000);
const maximumCompleteP95Ms = Number(process.env.MAX_COMPLETE_P95_MS ?? 2000);

const paths = [
  "/ka/collections/synthetic-collection?material=silk&color=ivory&availability=in-stock&sort=price-desc",
  "/en/search?q=SYN-04980",
  "/de/products/syn-04980",
  "/ru/collections/synthetic-collection?page=25&sort=price-asc",
];

if (
  !Number.isSafeInteger(iterations) ||
  iterations < 1 ||
  !Number.isSafeInteger(concurrency) ||
  concurrency < 1
) {
  throw new Error("ITERATIONS and CONCURRENCY must be positive integers.");
}

const firstByteDurations = [];
const completeDurations = [];
let requestIndex = 0;

async function worker() {
  while (requestIndex < iterations) {
    const index = requestIndex;
    requestIndex += 1;
    const startedAt = performance.now();
    const response = await fetch(`${baseUrl}${paths[index % paths.length]}`, {
      headers: { "x-epoca-load-check": "catalog-us1" },
    });
    firstByteDurations.push(performance.now() - startedAt);
    const body = await response.text();
    completeDurations.push(performance.now() - startedAt);
    if (!response.ok || !body.includes("ÉPOCA")) {
      throw new Error(
        `Catalog request ${index + 1} failed with ${response.status}.`,
      );
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
firstByteDurations.sort((left, right) => left - right);
completeDurations.sort((left, right) => left - right);
const percentile = (durations, value) =>
  durations[
    Math.min(
      Math.ceil((value / 100) * durations.length) - 1,
      durations.length - 1,
    )
  ];
const result = {
  baseUrl,
  requests: completeDurations.length,
  concurrency,
  firstByteP50Ms: Math.round(percentile(firstByteDurations, 50)),
  firstByteP95Ms: Math.round(percentile(firstByteDurations, 95)),
  completeP95Ms: Math.round(percentile(completeDurations, 95)),
  maximumCompleteMs: Math.round(completeDurations.at(-1)),
  budgetP95Ms: maximumP95Ms,
  completeBudgetP95Ms: maximumCompleteP95Ms,
};

console.log(JSON.stringify(result, null, 2));
if (result.firstByteP95Ms > maximumP95Ms) {
  throw new Error(
    `Catalog first-byte p95 ${result.firstByteP95Ms}ms exceeded ${maximumP95Ms}ms.`,
  );
}
if (result.completeP95Ms > maximumCompleteP95Ms) {
  throw new Error(
    `Catalog completion p95 ${result.completeP95Ms}ms exceeded ${maximumCompleteP95Ms}ms.`,
  );
}
