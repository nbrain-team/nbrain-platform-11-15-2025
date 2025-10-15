import * as React from "react"
import { cn } from "@/lib/utils"

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>

interface IconBadgeProps {
  icon: IconComponent
  className?: string
  size?: number // px
  boxed?: boolean // optional bordered container
}

// Renders a two-colored icon: navy stroke + small brand color accent dot
export function IconBadge({ icon: Icon, className, size = 56, boxed = false }: IconBadgeProps) {
  const iconSize = Math.floor(size * 0.55)
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        boxed ? "rounded-lg border border-[var(--color-border)] bg-white" : "",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Icon
        className="text-[var(--color-navy)]"
        width={iconSize}
        height={iconSize}
        strokeWidth={2}
      />
      <span className="absolute bottom-0 right-0 inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] shadow-sm" />
    </span>
  )
}


