import { useState } from "react";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/20/solid";
type CopyButtonProps = {
  content: string;
  color?: "blue" | "white";
};

export const CopyButton = ({ content, color = "blue" }: CopyButtonProps) => {
  const isBrowser = typeof window !== "undefined";
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const copyHandler = async (content: string) => {
    if (!isBrowser) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopyMessage("コピーしました");
    } catch {
      setCopyMessage("コピーに失敗しました");
    }
    setTimeout(() => {
      setCopyMessage(null);
    }, 1500);
  };

  return (
    <button
      color={color}
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 p-2"
      onClick={() => copyHandler(content)}
    >
      {copyMessage ? (
        <div>
          <CheckIcon
            className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
            aria-hidden="true"
          />
        </div>
      ) : (
        <div>
          <ClipboardIcon
            className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
            aria-hidden="true"
          />
        </div>
      )}
    </button>
  );
};
