import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", style, ...props }, ref) => {
    const getVariantStyles = () => {
      switch (variant) {
        case "outline":
          return {
            background: 'transparent',
            border: '1px solid var(--color-border-strong)',
            color: 'var(--color-text-primary)',
          };
        case "ghost":
          return {
            background: 'transparent',
            color: 'var(--color-text-secondary)',
          };
        case "destructive":
          return {
            background: 'var(--color-danger)',
            color: 'white',
          };
        default: // "default"
          return {
            background: 'var(--color-accent)',
            color: 'white',
          };
      }
    };

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
          {
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3": size === "sm",
            "h-11 px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        style={{
          borderRadius: 'var(--radius-pill)',
          ...getVariantStyles(),
          ...style,
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
