import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileCheck2, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  label: string;
  required?: boolean;
  submissionId: string;
  field: string;
  value: string | null;
  onChange: (path: string | null) => void;
};

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

export function DocumentDropzone({ label, required, submissionId, field, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError(null);
      if (file.size > MAX_BYTES) {
        setError("File exceeds 10MB.");
        return;
      }
      setUploading(true);
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${submissionId}/${field}.${ext}`;
      const { error } = await supabase.storage
        .from("admissions-documents")
        .upload(path, file, { contentType: file.type });
      setUploading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setFileName(file.name);
      onChange(path);
    },
    [field, onChange, submissionId],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    multiple: false,
  });

  const filled = !!value;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>
          {label} {required && <span className="text-destructive">*</span>}
        </span>
        {filled && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setFileName(null);
            }}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          isDragActive
            ? "border-brand bg-brand-soft"
            : filled
              ? "border-emerald-400/60 bg-emerald-50/50"
              : "border-border bg-surface-muted/50 hover:border-brand/50"
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        ) : filled ? (
          <>
            <FileCheck2 className="h-6 w-6 text-emerald-600" />
            <div className="mt-1 text-sm font-medium text-emerald-700 truncate max-w-full">
              {fileName ?? "Uploaded"}
            </div>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="mt-1 text-sm text-foreground">Drag & drop or click to upload</div>
            <div className="text-xs text-muted-foreground">PDF, JPG, PNG · max 10 MB</div>
          </>
        )}
      </div>
      {error && <div className="text-xs text-destructive">{error}</div>}
    </div>
  );
}