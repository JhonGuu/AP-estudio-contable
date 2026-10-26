import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Wrapper minimo sobre <select> nativo, en vez de un combobox de Radix: las
 * listas que maneja la app (condicion IVA, provincia, moneda, medios de
 * pago) son cortas y no necesitan busqueda ni opciones ricas, y evita sumar
 * una dependencia mas solo para esto.
 */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
