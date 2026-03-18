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
          "rounded-lg bg-[#F5821F] text-white border-none hover:bg-[#D96A0A] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(245,130,31,0.25)] active:bg-[#C25E08]",
        destructive:
          "rounded-lg bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-[#DC2626] hover:text-white",
        outline:
          "rounded-lg bg-white text-[#1C1917] border border-[#E8E6E2] hover:border-[#A8A29E] hover:bg-[#FAFAF9]",
        secondary:
          "rounded-lg bg-[#FEF0E3] text-[#F5821F] border border-[#F5821F]/20 hover:bg-[#F5821F]/15",
        ghost:
          "rounded-lg bg-transparent text-[#57534E] border border-transparent hover:bg-[#F4F3F1] hover:text-[#1C1917]",
        link: "text-[#F5821F] underline-offset-4 hover:underline",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
