import React, { useState, ChangeEvent } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelect(file);

      // Generate preview
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {previewUrl && (
        <div>
          <p className="text-sm text-gray-400">Preview:</p>
          <img src={previewUrl} alt="Preview" className="max-w-[200px] rounded border" />
        </div>
      )}
    </div>
  );
};

export default FileUpload;