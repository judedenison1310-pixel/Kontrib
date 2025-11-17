import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyLinkButtonProps {
  link: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function CopyLinkButton({
  link,
  className,
  variant = "outline",
  size = "sm",
  showIcon = true,
  children,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Group link copied to clipboard. Share it with members.",
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Group link copied to clipboard. Share it with members.",
      });

      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant={variant}
      size={size}
      className={cn(
        "transition-all duration-200",
        copied && "bg-green-100 border-green-300 text-green-700",
        className,
      )}
      data-testid="button-copy-link"
    >
      {showIcon &&
        (copied ? (
          <Check className="w-4 h-4 mr-2" />
        ) : (
          <Copy className="w-4 h-4 mr-2" />
        ))}
      {children || (copied ? "Copied!" : "Copy Link")}
    </Button>
  );
}

interface ShareableLinkDisplayProps {
  link: string;
  title?: string;
  description?: string;
  className?: string;
}

export function ShareableLinkDisplay({
  link,
  title = "Group Link",
  description = "Share this link with people you want to invite to your group",
  className,
}: ShareableLinkDisplayProps) {
  return (
    <div className={cn("space-y-3 w-full", className)}>
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-600">{description}</p>
      </div>

      {/* Responsive layout: column on mobile, row on larger screens */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-700 font-mono truncate">
              {link}
            </span>
          </div>
        </div>

        {/* Button full-width on mobile, auto on larger screens */}
        <div className="w-full sm:w-auto flex-shrink-0">
          <CopyLinkButton link={link} className="w-full sm:w-auto" />
        </div>
      </div>
    </div>
  );
}
