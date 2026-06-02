import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { Upload, File, Loader2, AlertTriangle, CheckCircle } from "lucide-react";

const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond <= 0) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  const index = Math.min(Math.max(i, 0), sizes.length - 1);
  return parseFloat((bytesPerSecond / Math.pow(k, index)).toFixed(1)) + " " + sizes[index];
};

interface UploadDropzoneProps {
  roomId: string;
  senderName: string;
  onUploadSuccess: () => void;
}

export default function UploadDropzone({ roomId, senderName, onUploadSuccess }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentFileName, setCurrentFileName] = useState("");
  const uploadStartTimeRef = useRef<number | null>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;

    // Check size limit: 100MB
    const maxBytes = 100 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadState("error");
      setErrorMessage("File exceeds the 100MB limit. Compress it first!");
      return;
    }

    uploadFileXHR(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFileXHR = (file: File) => {
    setUploadState("uploading");
    setUploadProgress(0);
    setUploadSpeed("");
    setErrorMessage("");
    setCurrentFileName(file.name);
    uploadStartTimeRef.current = Date.now();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sender", senderName);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/rooms/${encodeURIComponent(roomId)}/upload`, true);

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);

        if (uploadStartTimeRef.current) {
          const elapsed = (Date.now() - uploadStartTimeRef.current) / 1000;
          if (elapsed > 0.1) {
            const bytesPerSecond = event.loaded / elapsed;
            setUploadSpeed(formatSpeed(bytesPerSecond));
          }
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadState("success");
        onUploadSuccess();
        // Return to idle after a few seconds
        setTimeout(() => {
          setUploadState("idle");
          setCurrentFileName("");
        }, 3000);
      } else {
        setUploadState("error");
        try {
          const res = JSON.parse(xhr.responseText);
          setErrorMessage(res.error || "File upload failed.");
        } catch {
          setErrorMessage("Failed to upload file to backend server.");
        }
      }
    };

    xhr.onerror = () => {
      setUploadState("error");
      setErrorMessage("Network error occurred during file upload.");
    };

    xhr.send(formData);
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full min-h-[220px] p-6 text-center border-2 border-dashed rounded-3xl transition-all duration-300 ${
          isDragActive
            ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/5"
            : "border-white/10 bg-white/5 backdrop-blur-md hover:border-white/20 hover:bg-white/8 shadow-xl"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          id="wifi-file-upload-input"
        />

        {uploadState === "idle" && (
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-white/10 text-blue-400 border border-white/10 shadow-lg animate-bounce duration-1000">
              <Upload className="w-6 h-6" />
            </div>
            <p className="font-display font-semibold text-slate-100 text-base">
              Drag and drop any file here
            </p>
            <p className="mt-1 text-xs text-slate-400 font-sans">
              or browse from device local storage
            </p>
            <button
              onClick={onButtonClick}
              type="button"
              className="mt-4 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-500/30 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-blue-950/50"
            >
              Select File (Max 100MB)
            </button>
          </div>
        )}

        {uploadState === "uploading" && (
          <div className="flex flex-col items-center w-full max-w-sm px-4">
            <div className="relative flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-white/10 text-blue-400 border border-white/10 shadow-lg">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <p className="font-display font-semibold text-slate-200 text-sm truncate w-full" title={currentFileName}>
              Uploading {currentFileName}
            </p>
            <div className="flex justify-between w-full mt-2 text-xs text-slate-400 font-mono px-0.5">
              <span>Progress: {uploadProgress}%</span>
              {uploadSpeed && <span className="text-blue-400 font-semibold">{uploadSpeed}</span>}
            </div>

            {/* Progress Bar Container */}
            <div className="w-full h-2 mt-3.5 bg-white/5 rounded-full border border-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-150 ease-out rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {uploadState === "success" && (
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="font-display font-semibold text-emerald-400 text-lg">
              Successfully Uploaded
            </p>
            <p className="mt-1 text-xs text-slate-300 font-sans truncate max-w-[280px]">
              {currentFileName}
            </p>
            <p className="mt-2 text-[10px] text-slate-500 font-sans uppercase tracking-widest font-bold">
              Instant Share Active
            </p>
          </div>
        )}

        {uploadState === "error" && (
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="font-display font-semibold text-rose-400 text-lg">
              Upload Failed
            </p>
            <p className="mt-1 text-[13px] text-rose-300 font-sans max-w-[320px]">
              {errorMessage}
            </p>
            <button
              onClick={() => setUploadState("idle")}
              type="button"
              className="mt-4 px-4 py-2 text-xs font-semibold text-slate-300 bg-white/10 border border-white/10 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
