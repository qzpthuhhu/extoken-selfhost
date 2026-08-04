import React from "react";

import { Badge } from "@client/src/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  className?: string;
  showDot?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  className,
  showDot = true,
}) => {
  return (
    <Badge
      variant="secondary"
      className={cn("shrink-0 rounded-sm gap-1.5", className)}
    >
      {showDot && (
        <span className="size-1.5 rounded-full bg-current shrink-0" />
      )}
      {label}
    </Badge>
  );
};

export default StatusBadge;
