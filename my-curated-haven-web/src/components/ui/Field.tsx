import {
  cloneElement,
  InputHTMLAttributes,
  isValidElement,
  ReactElement,
  ReactNode,
} from "react";

type ControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<ControlProps>;
};

export default function Field({ id, label, hint, error, children }: FieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })
    : children;

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
      {control}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-12 w-full rounded-xl border border-border-control bg-surface px-3 text-base text-foreground ${props.className ?? ""}`}
    />
  );
}

export function FieldExampleNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-text-muted">{children}</p>;
}
