import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-forest-700 text-white shadow-sm hover:bg-forest-800 active:translate-y-px",
        emerald: "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600",
        navy: "bg-navy-900 text-white hover:bg-navy-800",
        outline: "border border-navy-200 bg-white text-navy-900 hover:border-navy-300 hover:bg-navy-50",
        ghost: "text-navy-900 hover:bg-navy-50",
        light: "bg-white/95 text-navy-900 hover:bg-white shadow-sm",
        "outline-light": "border border-white/50 text-white hover:bg-white/10",
        gold: "bg-gold-500 text-navy-950 hover:bg-gold-400",
        danger: "bg-danger text-white hover:bg-red-800",
        link: "text-forest-700 underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
