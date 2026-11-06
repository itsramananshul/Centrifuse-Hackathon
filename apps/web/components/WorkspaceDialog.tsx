"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function WorkspaceDialog({ title, drawer = false, onClose, children }: {
  title: string; drawer?: boolean; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);

  return <dialog ref={dialog} aria-label={title}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    className={"overflow-hidden border border-clinical-border bg-clinical-bg p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/35 " + (drawer
      ? "inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-[720px] border-y-0 border-r-0"
      : "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md rounded-[20px]")}>
    <div className={"flex flex-col " + (drawer ? "h-full" : "max-h-[calc(100dvh-2rem)]")}>
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-clinical-border bg-clinical-card px-4 sm:px-5">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" aria-label={"Close " + title.toLowerCase()} onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-primary-400">
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      {children}
    </div>
  </dialog>;
}
