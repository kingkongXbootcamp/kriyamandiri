import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "whatsapp" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variants = {
      primary:
        "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500 rounded-xl",
      whatsapp:
        "bg-whatsapp-500 text-white hover:bg-whatsapp-600 focus:ring-whatsapp-500 rounded-xl",
      outline:
        "border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-slate-400 rounded-xl",
      ghost:
        "text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg",
    };

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-4 text-base",
      lg: "h-13 px-6 text-lg w-full",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";