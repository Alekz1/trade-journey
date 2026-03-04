import { useState, FC, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
const API_URL = import.meta.env.VITE_API_URL;

interface ImageModalProps {
  imageSrc: string;
  buttonText?: string;
  altText?: string;
}

const ImageModal: FC<ImageModalProps> = ({
  imageSrc,
  buttonText,
  altText = "Trade chart",
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const { t } = useTranslation();
  const label = buttonText ?? t("open_image");

  // Escape key dismiss
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); },
    []
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, handleKey]);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="px-2 py-1 border border-green-600/60 text-green-600 text-xs bg-black hover:border-green-300 hover:text-green-400 transition flex items-center gap-1"
        title={label}
      >
        <Icon icon="pixelarticons:image" width={14} height={14} />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
          onClick={() => setOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-green-600 border border-green-600/60 p-1.5 bg-black hover:border-green-300 transition"
            onClick={() => setOpen(false)}
          >
            <Icon icon="pixelarticons:close" width={20} height={20} />
          </button>

          {/* Image — stop propagation so clicking the image doesn't close */}
          <img
            src={`${API_URL}/fetch-image/${imageSrc}`}
            alt={altText}
            className="max-w-[90vw] max-h-[85vh] object-contain border border-green-900/60"
            onClick={(e) => e.stopPropagation()}
          />

          {/* ESC hint */}
          <p className="absolute bottom-4 text-green-900 text-xs">
            ESC or click outside to close
          </p>
        </div>
      )}
    </>
  );
};

export default ImageModal;