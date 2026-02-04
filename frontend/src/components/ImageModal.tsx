import { useState, FC } from "react";
import { useTranslation } from "react-i18next";

interface ImageModalProps {
  imageSrc: string;          // required: path or URL to the image
  buttonText?: string;       // optional: text for the button
  altText?: string;          // optional: alt text for accessibility
}



const ImageModal: FC<ImageModalProps> = ({
  imageSrc,
  buttonText,
  altText = "Centered Image",
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const { t } = useTranslation();
  
  buttonText = t(buttonText || "open_image");

  return (
    <div>
      {/* Trigger Button */}
      <button
        onClick={() => 
            setOpen(true)
        }
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        {buttonText}
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <img
            src={`/fetch-image/${imageSrc}`}
            alt={altText}
            className="max-w-[80%] max-h-[80%] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default ImageModal;