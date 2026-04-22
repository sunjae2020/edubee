import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-lg text-white border-none hover:-translate-y-px hover:shadow-[0_4px_12px_var(--e-orange-shadow-25)] active:opacity-90",
        destructive:
          "rounded-lg bg-red-50 text-red-600 border border-[var(--e-border)] hover:bg-red-600 hover:text-white",
        outline:
          "rounded-lg bg-[var(--e-bg-surface)] text-[var(--e-text-1)] border border-[var(--e-border)] hover:border-[var(--e-text-3)] hover:bg-[var(--e-bg-muted)]",
        secondary:
          "rounded-lg text-orange-600 border border-orange-200 hover:opacity-90",
        ghost:
          "rounded-lg bg-transparent text-[var(--e-text-2)] border border-transparent hover:bg-[var(--e-bg-muted)] hover:text-[var(--e-text-1)]",
        link: "underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[40px] px-5 py-2.5",
        sm: "min-h-[32px] rounded-lg px-3 text-xs",
        lg: "min-h-[44px] rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  default: { backgroundColor: "var(--e-orange, #F5821F)", color: "white" },
  secondary: { backgroundColor: "var(--e-orange-lt, #FEF0E3)", color: "var(--e-orange, #F5821F)" },
  link: { color: "var(--e-orange, #F5821F)" },
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style: styleProp, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const variantStyle = VARIANT_STYLES[variant ?? "default"] ?? {}
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ ...variantStyle, ...styleProp }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
