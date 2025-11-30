import { cn } from "@/lib/utils";
import { Check, X, Clock, Upload, Share2 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

interface ProgressCircleProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  collected?: string;
  target?: string;
}

export function ProgressCircle({
  percentage,
  size = 120,
  strokeWidth = 10,
  className,
  showLabel = true,
  collected,
  target,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-gray-200"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-primary transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(percentage)}%</span>
          {collected && target && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">of target</span>
          )}
        </div>
      )}
    </div>
  );
}

interface StatusBadgeProps {
  status: "paid" | "pending" | "unpaid" | "confirmed" | "rejected";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const statusConfig = {
    paid: {
      bg: "bg-green-100",
      text: "text-green-800",
      icon: Check,
      label: "Paid",
    },
    confirmed: {
      bg: "bg-green-100",
      text: "text-green-800",
      icon: Check,
      label: "Confirmed",
    },
    pending: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      icon: Clock,
      label: "Pending",
    },
    unpaid: {
      bg: "bg-red-100",
      text: "text-red-800",
      icon: X,
      label: "Not Paid",
    },
    rejected: {
      bg: "bg-red-100",
      text: "text-red-800",
      icon: X,
      label: "Rejected",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full",
        sizeClasses[size],
        config.bg,
        config.text,
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

interface BigButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "whatsapp";
  className?: string;
  icon?: React.ReactNode;
  type?: "button" | "submit";
  "data-testid"?: string;
}

export function BigButton({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  className,
  icon,
  type = "button",
  "data-testid": testId,
}: BigButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] w-full touch-action-manipulation";

  const variantClasses = {
    primary: "bg-primary hover:bg-primary/90 text-white",
    outline: "border-2 border-primary text-primary hover:bg-primary/5 bg-white dark:bg-transparent",
    whatsapp: "bg-[#25D366] hover:bg-[#20bd5a] text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(baseClasses, variantClasses[variant], className)}
      data-testid={testId}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

interface WhatsAppShareButtonProps {
  message: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function WhatsAppShareButton({ message, className, size = "md" }: WhatsAppShareButtonProps) {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-4 text-lg",
    lg: "px-8 py-5 text-xl",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleShare = () => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.98] bg-[#25D366] hover:bg-[#20bd5a]",
        sizeClasses[size],
        className
      )}
      data-testid="button-whatsapp-share"
    >
      <SiWhatsapp className={iconSizes[size]} />
      Share on WhatsApp
    </button>
  );
}

interface UploadProofButtonProps {
  onClick?: () => void;
  className?: string;
}

export function UploadProofButton({ onClick, className }: UploadProofButtonProps) {
  return (
    <BigButton
      onClick={onClick}
      variant="primary"
      icon={<Upload className="h-5 w-5" />}
      className={className}
      data-testid="button-upload-proof"
    >
      Upload Payment Proof
    </BigButton>
  );
}

interface MemberListItemProps {
  name: string;
  amount?: string;
  status: "paid" | "pending" | "unpaid";
  avatarUrl?: string;
  className?: string;
}

export function MemberListItem({
  name,
  amount,
  status,
  avatarUrl,
  className,
}: MemberListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100",
        className
      )}
      data-testid={`member-item-${name.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          {amount && <p className="text-sm text-gray-500">₦{amount}</p>}
        </div>
      </div>
      <StatusBadge status={status} size="sm" />
    </div>
  );
}

interface AmountDisplayProps {
  amount: string | number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AmountDisplay({ amount, label, size = "md", className }: AmountDisplayProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const formattedAmount =
    typeof amount === "number"
      ? amount.toLocaleString("en-NG")
      : parseFloat(amount).toLocaleString("en-NG");

  return (
    <div className={cn("flex flex-col", className)}>
      {label && <span className="text-sm text-gray-500 mb-1">{label}</span>}
      <span className={cn("font-bold text-primary", sizeClasses[size])} data-testid="text-amount">
        ₦{formattedAmount}
      </span>
    </div>
  );
}

interface CardKontribProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function CardKontrib({ children, className, onClick }: CardKontribProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm p-5",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse bg-gray-200 rounded-lg", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
