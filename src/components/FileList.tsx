import React, { useState, useEffect } from "react";
import { FileMetadata } from "../types";
import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code2,
  File,
  Download,
  QrCode,
  Trash2,
  Clock,
  User,
} from "lucide-react";
import QRCodeModal from "./QRCodeModal";

interface FileListProps {
  files: FileMetadata[];
  roomId: string;
  onDeleteFile: (fileId: string) => void;
}

export default function FileList({ files, roomId, onDeleteFile }: FileListProps) {
  const [selectedQRFile, setSelectedQRFile] = useState<FileMetadata | null>(null);

  // Helper for sizing
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Helper to map files to custom beautiful icons
  const getFileIcon = (mimeType: string) => {
    const mime = mimeType.toLowerCase();
    if (mime.startsWith("image/")) {
      return <Image className="w-5 h-5 text-indigo-500" />;
    }
    if (mime.startsWith("video/")) {
      return <Video className="w-5 h-5 text-amber-500" />;
    }
    if (mime.startsWith("audio/")) {
      return <Music className="w-5 h-5 text-emerald-500" />;
    }
    if (
      mime.includes("pdf") ||
      mime.includes("document") ||
      mime.includes("word") ||
      mime.includes("text")
    ) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    if (
      mime.includes("zip") ||
      mime.includes("tar") ||
      mime.includes("gzip") ||
      mime.includes("rar") ||
      mime.includes("7z")
    ) {
      return <Archive className="w-5 h-5 text-purple-500" />;
    }
    if (
      mime.includes("json") ||
      mime.includes("javascript") ||
      mime.includes("typescript") ||
      mime.includes("html") ||
      mime.includes("css") ||
      mime.includes("xml")
    ) {
      return <Code2 className="w-5 h-5 text-sky-500" />;
    }
    return <File className="w-5 h-5 text-neutral-500" />;
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-xl">
        <File className="w-10 h-10 text-slate-600 stroke-[1.5] mb-3" />
        <p className="font-display font-semibold text-slate-300 text-sm">No files shared yet</p>
        <p className="text-xs text-slate-500 font-sans mt-1.5 max-w-[240px] leading-relaxed">
          Drag and drop files to start sharing instantly with other devices in this room.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          onDelete={() => onDeleteFile(file.id)}
          onShowQR={() => setSelectedQRFile(file)}
          getFileIcon={getFileIcon}
          formatBytes={formatBytes}
        />
      ))}

      {selectedQRFile && (
        <QRCodeModal
          isOpen={!!selectedQRFile}
          onClose={() => setSelectedQRFile(null)}
          downloadUrl={`${window.location.origin}/api/download/${selectedQRFile.id}`}
          fileName={selectedQRFile.originalName}
        />
      )}
    </div>
  );
}

interface FileItemProps {
  key?: string;
  file: FileMetadata;
  onDelete: () => void;
  onShowQR: () => void;
  getFileIcon: (mimeType: string) => React.ReactNode;
  formatBytes: (bytes: number) => string;
}

function FileItem({ file, onDelete, onShowQR, getFileIcon, formatBytes }: FileItemProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = file.expiresAt - Date.now();
      if (difference <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft(`${minutes}m ${seconds}s`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [file.expiresAt]);

  const directDownloadUrl = `/api/download/${file.id}`;

  return (
    <div className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-2xl shadow-xl transition-all duration-300">
      <div className="flex items-center space-x-3.5 min-w-0 flex-1 mr-3">
        {/* Icon container */}
        <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800 border border-white/5 group-hover:border-white/10 transition-all">
          {getFileIcon(file.mimeType)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p
            className="font-sans font-semibold text-slate-100 text-sm truncate"
            title={file.originalName}
          >
            {file.originalName}
          </p>
          <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1.5 mt-1.5 text-xs text-slate-400 font-sans">
            <span className="font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 text-[10px]">{formatBytes(file.size)}</span>
            <span className="inline-block w-1 h-1 bg-white/10 rounded-full" />
            <span className="flex items-center gap-1.5 text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 text-[10px]">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[100px]" title={file.sender}>{file.sender}</span>
            </span>
            <span className="inline-block w-1 h-1 bg-white/10 rounded-full" />
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-2.5 py-0.5 rounded-md">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft} left</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-1.5 flex-shrink-0">
        <button
          onClick={onShowQR}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl transition-all cursor-pointer"
          title="Share QR Code for Mobile devices"
        >
          <QrCode className="w-4.5 h-4.5" />
        </button>

        <a
          href={directDownloadUrl}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
          title="Download file"
          download
        >
          <Download className="w-4.5 h-4.5" />
        </a>

        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/20 rounded-xl transition-all cursor-pointer"
          title="Delete file"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
}
