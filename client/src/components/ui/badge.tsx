import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full text-xs font-medium ring-1 ring-inset transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground ring-primary/20 hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground ring-secondary/20 hover:bg-secondary/90",
        destructive:
          "bg-destructive text-destructive-foreground ring-destructive/20 hover:bg-destructive/90",
        outline: "text-foreground ring-border",
        ambient: "bg-green-100 text-green-800 ring-green-500/20",
        cold: "bg-blue-100 text-blue-800 ring-blue-500/20",
        frozen: "bg-purple-100 text-purple-800 ring-purple-500/20",
      },
      size: {
        default: "h-5 px-2",
        sm: "h-4 px-1.5",
        lg: "h-6 px-3",
        count: "h-5 w-5 p-0"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
