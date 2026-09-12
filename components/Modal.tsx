import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); opener?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => {
    if (e.target === e.currentTarget) {
      const r = e.currentTarget.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
    }
  }}>
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-700 bg-spartan-gray px-5 py-3">
      <h2 className="font-bold">{title}</h2><button autoFocus className="quiet-button" aria-label="閉じる" onClick={onClose}><X size={20} /></button>
    </div>
    <div className="p-5">{children}</div>
  </dialog>;
}
