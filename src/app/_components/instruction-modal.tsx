import { XMarkIcon } from "@heroicons/react/20/solid";
import Image from "next/image";
import { useEffect, useState } from "react";

export const InstructionModal = ({
  qrUrl,
  setIsOpen,
}: {
  qrUrl: string;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  return (
    <div
      className={`absolute bottom-0 z-30 flex h-[85%] w-full flex-col gap-6 rounded-t-2xl bg-slate-700/30 px-6 pt-8 text-white backdrop-blur-xl`}
    >
      <div className="sticky top-0 flex flex-row items-center justify-end">
        <div className="flex flex-row items-center gap-2">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/30"
            onClick={() => {
              setIsOpen(false);
            }}
          >
            <XMarkIcon
              className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <div className="rounded-lg bg-white p-2">
          <div className="h-40 w-40">
            {isClient && (
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrUrl)}&size=300x300&color=334155`}
                alt="QRCode"
                width={300}
                height={300}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
