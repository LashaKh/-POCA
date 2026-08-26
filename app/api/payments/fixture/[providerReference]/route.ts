import { NextResponse } from "next/server";

import { approveFixturePayment } from "@/features/payments/fixture-approval";

export async function GET(
  request: Request,
  context: { params: Promise<{ providerReference: string }> },
) {
  const { providerReference } = await context.params;
  const order = await approveFixturePayment(providerReference);
  if (!order) return new Response(null, { status: 404 });
  const returnUrl = new URL(`/${order.locale}/payment/return`, request.url);
  returnUrl.searchParams.set("reference", order.reference);
  return NextResponse.redirect(returnUrl, 303);
}
