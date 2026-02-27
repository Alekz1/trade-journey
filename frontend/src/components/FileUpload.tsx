import React, { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Icon } from "@iconify/react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    onFileSelect(file);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Drop zone */}
      <div
        className={`border border-dashed cursor-pointer p-3 text-center transition ${
          dragging
            ? "border-green-400 bg-green-950/30"
            : previewUrl
            ? "border-green-600/60 bg-green-950/20"
            : "border-green-900/60 hover:border-green-600/40"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
        {previewUrl ? (
          <div className="flex flex-col items-center gap-1">
            <Icon icon="pixelarticons:image" width={20} className="text-green-dark" />
            <p className="text-green-dark text-xs truncate max-w-full px-2">{fileName}</p>
            <p className="text-green-900 text-xs">click to change</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-green-800">
            <Icon icon="pixelarticons:image-plus" width={18} />
            <span className="text-xs">Attach chart image (optional)</span>
          </div>
        )}
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-40 object-contain border border-green-900/60"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1 right-1 bg-black/80 text-red-500 border border-red-900/60 hover:border-red-400 p-0.5 transition"
            title="Remove image"
          >
            <Icon icon="pixelarticons:close" width={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;