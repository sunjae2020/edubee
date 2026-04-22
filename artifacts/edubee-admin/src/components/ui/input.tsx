import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[var(--e-border)] bg-[var(--e-bg-surface)] px-3 py-1 text-sm text-[var(--e-text-1)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--e-text-3)] focus-visible:outline-none focus-visible:border-(--e-orange) focus-visible:ring-[3px] focus-visible:ring-(--e-orange)/15 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
