import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  colorClass: string;
  className?: string;
}

export function StatusBadge({ label, colorClass, className }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", colorClass, className)}>
      {label}
    </span>
  );
}
