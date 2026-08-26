const MAX_MINOR = 9_000_000_000_000_000;

declare const minorAmountBrand: unique symbol;

export type MinorAmount = number & {
  readonly [minorAmountBrand]: "MinorAmount";
};

export function minorAmount(value: number): MinorAmount {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_MINOR) {
    throw new RangeError("Minor amount must be a non-negative safe integer.");
  }

  return value as MinorAmount;
}

export function addMinor(...amounts: MinorAmount[]): MinorAmount {
  return minorAmount(amounts.reduce((total, value) => total + value, 0));
}

export function subtractMinor(
  amount: MinorAmount,
  deduction: MinorAmount,
): MinorAmount {
  return minorAmount(amount - deduction);
}

export function applyBasisPoints(
  amount: MinorAmount,
  basisPoints: number,
): MinorAmount {
  if (
    !Number.isSafeInteger(basisPoints) ||
    basisPoints < 0 ||
    basisPoints > 10_000
  ) {
    throw new RangeError(
      "Basis points must be an integer from 0 through 10,000.",
    );
  }

  const numerator = BigInt(amount) * BigInt(basisPoints);
  return minorAmount(Number((numerator + 5_000n) / 10_000n));
}

export function allocateMinor(
  total: MinorAmount,
  weights: readonly number[],
): MinorAmount[] {
  if (
    weights.length === 0 ||
    weights.some((weight) => !Number.isSafeInteger(weight) || weight < 0)
  ) {
    throw new RangeError(
      "Allocation weights must be non-negative safe integers.",
    );
  }

  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal <= 0) {
    throw new RangeError("At least one allocation weight must be positive.");
  }

  const exact = weights.map((weight, index) => {
    const numerator = BigInt(total) * BigInt(weight);
    return {
      index,
      floor: Number(numerator / BigInt(weightTotal)),
      remainder: numerator % BigInt(weightTotal),
    };
  });
  const allocated = exact.map(({ floor }) => floor);
  let remaining = total - allocated.reduce((sum, value) => sum + value, 0);

  for (const { index } of [...exact].sort(
    (left, right) =>
      Number(right.remainder - left.remainder) || left.index - right.index,
  )) {
    if (remaining === 0) break;
    allocated[index] += 1;
    remaining -= 1;
  }

  return allocated.map(minorAmount);
}
