"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getViewerOrder } from "@/features/orders/queries";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import { validateReturnEvidence } from "./evidence-validation";

export type ReturnEvidenceState =
  | CommandResult<{ evidenceId: string }>
  | undefined;

async function authorizedReturnContext(
  returnRequestId: string,
  orderReference: string,
  locale: AppLocale,
) {
  const browserClient = await createServerSupabaseClient();
  const owned = await browserClient
    .from("return_requests")
    .select("id,order_id,guest_session_id,policy_id,status")
    .eq("id", returnRequestId)
    .maybeSingle();
  if (owned.error) throw owned.error;
  const service = createServiceSupabaseClient();
  if (owned.data) {
    return { request: owned.data, guestProofHash: undefined, service };
  }
  const order = await getViewerOrder(orderReference, locale);
  if (!order) return undefined;
  const request = await service
    .from("return_requests")
    .select("id,order_id,guest_session_id,policy_id,status")
    .eq("id", returnRequestId)
    .eq("order_id", order.order.id)
    .maybeSingle();
  if (request.error) throw request.error;
  if (!request.data) return undefined;
  return {
    request: request.data,
    guestProofHash: order.order.guest_proof_hash ?? undefined,
    service,
  };
}

export async function uploadReturnEvidenceAction(
  _previous: ReturnEvidenceState,
  formData: FormData,
): Promise<ReturnEvidenceState> {
  const correlationId = randomUUID();
  const localeValue = formData.get("locale");
  const returnRequestId = formData.get("returnRequestId");
  const orderReference = formData.get("orderReference");
  const file = formData.get("evidence");
  if (
    !isAppLocale(localeValue) ||
    typeof returnRequestId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(returnRequestId) ||
    typeof orderReference !== "string" ||
    !/^EPO-[A-Z0-9]{12}$/.test(orderReference) ||
    !(file instanceof File) ||
    file.size < 1
  ) {
    return commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "returns.errors.invalidEvidence",
        retryable: false,
      },
      correlationId,
    );
  }
  const context = await authorizedReturnContext(
    returnRequestId,
    orderReference,
    localeValue,
  );
  if (!context) {
    return commandFailure(
      {
        code: "FORBIDDEN",
        messageKey: "returns.errors.invalidEvidence",
        retryable: false,
      },
      correlationId,
    );
  }
  const policy = await context.service
    .from("return_policies")
    .select("max_evidence_bytes,allowed_evidence_types")
    .eq("id", context.request.policy_id)
    .single();
  if (policy.error) throw policy.error;
  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateReturnEvidence({
    bytes: buffer,
    claimedType: file.type,
    size: file.size,
    maximumBytes: policy.data.max_evidence_bytes,
    allowedTypes: policy.data.allowed_evidence_types,
  });
  if (!validated.ok) {
    return commandFailure(
      {
        code: "FILE_TYPE_INVALID",
        messageKey: "returns.errors.invalidEvidence",
        retryable: false,
      },
      correlationId,
    );
  }
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[validated.detectedType];
  const storagePath = `${returnRequestId}/${randomUUID()}.${extension}`;
  const upload = await context.service.storage
    .from("return-evidence")
    .upload(storagePath, buffer, {
      contentType: validated.detectedType,
      cacheControl: "0",
      upsert: false,
    });
  if (upload.error) {
    return commandFailure(
      {
        code: "UPLOAD_REJECTED",
        messageKey: "returns.errors.uploadFailed",
        retryable: true,
      },
      correlationId,
    );
  }
  const attached = await context.service.rpc("attach_return_evidence", {
    p_return_request_id: returnRequestId,
    p_storage_path: storagePath,
    p_original_filename: file.name.slice(0, 255),
    p_content_type: validated.detectedType,
    p_byte_size: file.size,
    p_checksum: createHash("sha256").update(buffer).digest("hex"),
    p_guest_proof_hash: context.guestProofHash,
  });
  if (attached.error) {
    await context.service.storage.from("return-evidence").remove([storagePath]);
    return commandFailure(
      {
        code: "UPLOAD_REJECTED",
        messageKey: "returns.errors.uploadFailed",
        retryable: false,
      },
      correlationId,
    );
  }
  revalidatePath(`/${localeValue}/order/${orderReference}/request`);
  revalidatePath(`/${localeValue}/account/returns/${returnRequestId}`);
  return commandSuccess({ evidenceId: attached.data.id }, correlationId);
}

export async function removeReturnEvidenceAction(formData: FormData) {
  const localeValue = formData.get("locale");
  const returnRequestId = formData.get("returnRequestId");
  const orderReference = formData.get("orderReference");
  const evidenceId = formData.get("evidenceId");
  if (
    !isAppLocale(localeValue) ||
    typeof returnRequestId !== "string" ||
    typeof orderReference !== "string" ||
    typeof evidenceId !== "string"
  ) {
    return;
  }
  const context = await authorizedReturnContext(
    returnRequestId,
    orderReference,
    localeValue,
  );
  if (!context) return;
  const evidence = await context.service
    .from("return_evidence")
    .select("storage_path")
    .eq("id", evidenceId)
    .eq("return_request_id", returnRequestId)
    .maybeSingle();
  if (evidence.error || !evidence.data) return;
  const removed = await context.service.rpc("remove_return_evidence", {
    p_evidence_id: evidenceId,
    p_guest_proof_hash: context.guestProofHash,
  });
  if (removed.error) return;
  await context.service.storage
    .from("return-evidence")
    .remove([evidence.data.storage_path]);
  revalidatePath(`/${localeValue}/account/returns/${returnRequestId}`);
}

export async function cleanupReturnEvidence() {
  const service = createServiceSupabaseClient();
  const cleanup = await service.rpc("cleanup_abandoned_return_evidence", {
    p_limit: 100,
  });
  if (cleanup.error) throw cleanup.error;
  const paths = cleanup.data.map((item) => item.storage_path);
  if (paths.length) {
    const removal = await service.storage.from("return-evidence").remove(paths);
    if (removal.error) throw removal.error;
  }
  return { expired: paths.length };
}
