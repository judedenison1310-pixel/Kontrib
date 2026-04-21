import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  verifiedAt: Date | string | null | undefined;
  expiresAt?: Date | string | null;
  size?: "sm" | "md";
  withLabel?: boolean;
  className?: string;
}

export function VerifiedBadge({ verifiedAt, expiresAt, size = "sm", withLabel = false, className = "" }: Props) {
  if (!verifiedAt) return null;
  const dim = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  const verifiedDate = new Date(verifiedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  const expiresLine = expiresAt
    ? ` · valid until ${new Date(expiresAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}`
    : "";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 text-green-600 ${className}`} data-testid="verified-badge">
            <ShieldCheck className={dim} aria-label="Verified Ajo" />
            {withLabel && <span className="text-xs font-medium">Verified</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Verified Ajo Group</p>
          <p className="text-xs opacity-80">Verified {verifiedDate}{expiresLine}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
