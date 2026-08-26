import type { DialogHTMLAttributes, ReactNode } from "react";

type DialogProps = DialogHTMLAttributes<HTMLDialogElement> & {
  title: ReactNode;
  children: ReactNode;
};

export function Dialog({ title, children, ...props }: DialogProps) {
  return (
    <dialog {...props} aria-labelledby="dialog-title">
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}
