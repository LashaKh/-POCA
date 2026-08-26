"use client";

import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import Dashboard from "@uppy/react/dashboard";
import { useEffect, useMemo, useState } from "react";

import {
  authorizeUploadAction,
  uploadCompletedAction,
} from "@/features/ingestion/actions";
import {
  INGESTION_FILE_LIMIT,
  INGESTION_FILE_MAX_BYTES,
} from "@/features/ingestion/schema";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type UploadMeta = {
  bucketName?: string;
  objectName?: string;
  contentType?: string;
  cacheControl?: string;
  ingestionFileId?: string;
};

export function BatchUploader({
  batchId,
  labels,
}: {
  batchId: string;
  labels: {
    heading: string;
    help: string;
    authorize: string;
    upload: string;
    cancel: string;
    rejected: string;
  };
}) {
  const [authorizing, setAuthorizing] = useState(0);
  const [authorizedIds, setAuthorizedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<string>();
  const uppy = useMemo(
    () =>
      new Uppy<UploadMeta>({
        autoProceed: false,
        allowMultipleUploadBatches: true,
        restrictions: {
          maxFileSize: INGESTION_FILE_MAX_BYTES,
          maxNumberOfFiles: INGESTION_FILE_LIMIT,
          allowedFileTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/tiff",
          ],
        },
      }).use(Tus, {
        endpoint: "/api/ingestion/not-authorized",
        chunkSize: 6 * 1024 * 1024,
        limit: 3,
        retryDelays: [0, 1000, 3000, 5000, 10_000],
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        allowedMetaFields: [
          "bucketName",
          "objectName",
          "contentType",
          "cacheControl",
        ],
      }),
    [],
  );

  useEffect(() => {
    const authorize = async (fileId: string) => {
      const file = uppy.getFile(fileId);
      if (!file) return;
      setAuthorizing((count) => count + 1);
      setError(undefined);
      const result = await authorizeUploadAction({
        batchId,
        clientFileId: file.id,
        filename: file.name ?? "image",
        declaredMime: file.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/tiff",
        byteSize: file.size ?? 0,
      });
      setAuthorizing((count) => Math.max(0, count - 1));
      if (!result.ok) {
        setError(labels.rejected);
        uppy.removeFile(file.id);
        return;
      }
      const supabase = createBrowserSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError(labels.rejected);
        uppy.removeFile(file.id);
        return;
      }
      uppy.setFileMeta(file.id, {
        bucketName: result.data.bucket,
        objectName: result.data.path,
        contentType: file.type,
        cacheControl: "3600",
        ingestionFileId: result.data.fileId,
      });
      uppy.setFileState(file.id, {
        tus: {
          endpoint: result.data.tusEndpoint,
          headers: {
            authorization: `Bearer ${session.access_token}`,
            "x-signature": result.data.token,
          },
          chunkSize: 6 * 1024 * 1024,
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
        },
      });
      setAuthorizedIds((current) => new Set(current).add(file.id));
    };
    const onAdded = (file: { id: string }) => void authorize(file.id);
    const onRemoved = (file: { id: string }) => {
      setAuthorizedIds((current) => {
        const next = new Set(current);
        next.delete(file.id);
        return next;
      });
    };
    const onSuccess = (file: { meta: UploadMeta } | undefined) => {
      const fileId = file?.meta.ingestionFileId;
      if (fileId) void uploadCompletedAction({ fileId });
    };
    uppy.on("file-added", onAdded);
    uppy.on("file-removed", onRemoved);
    uppy.on("upload-success", onSuccess);
    return () => {
      uppy.off("file-added", onAdded);
      uppy.off("file-removed", onRemoved);
      uppy.off("upload-success", onSuccess);
      uppy.destroy();
    };
  }, [batchId, labels.rejected, uppy]);

  const fileCount = Object.keys(uppy.getFiles()).length;
  const canUpload =
    fileCount > 0 && authorizing === 0 && authorizedIds.size === fileCount;

  return (
    <section
      className="admin-panel ingestion-uploader"
      aria-labelledby="upload-heading"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">TUS · PRIVATE ORIGINALS</p>
          <h2 id="upload-heading">{labels.heading}</h2>
        </div>
        <p>{labels.help}</p>
      </div>
      <Dashboard
        uppy={uppy}
        proudlyDisplayPoweredByUppy={false}
        hideUploadButton
        height={390}
        width="100%"
        note={labels.help}
        hideProgressDetails={false}
      />
      <div className="button-row">
        <button
          className="button"
          type="button"
          disabled={!canUpload}
          onClick={() => void uppy.upload()}
        >
          {authorizing > 0 ? labels.authorize : labels.upload}
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => uppy.cancelAll()}
        >
          {labels.cancel}
        </button>
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
