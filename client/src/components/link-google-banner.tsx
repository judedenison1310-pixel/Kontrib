// Dismissible banner shown on the Groups page when a WhatsApp-first user does
// not yet have an email on file. Lets them link a Google account so we can
// send receipts and they can recover their account via Google.
//
// Dismissal is sticky for 7 days per browser (localStorage flag).

import { useEffect, useState } from "react";
import { X, Mail } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { startGoogleLink, getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const DISMISS_KEY = "kontrib_link_google_dismissed_at";
const DISMISS_DAYS = 7;

function isRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (Number.isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function LinkGoogleBanner() {
  const user = getCurrentUser();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Only show if user has no email AND hasn't dismissed recently.
    if (!user) return;
    if ((user as any).email) return;
    if (isRecentlyDismissed()) return;
    setVisible(true);
  }, [user]);

  if (!visible || !user) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  const onLink = async () => {
    setBusy(true);
    try {
      const url = await startGoogleLink();
      window.location.href = url;
    } catch (e: any) {
      setBusy(false);
      toast({
        title: "Couldn't start Google linking",
        description: e?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="relative rounded-xl border border-blue-100 bg-blue-50/70 p-4 flex items-start gap-3"
      data-testid="banner-link-google"
    >
      <div className="shrink-0 w-9 h-9 rounded-full bg-white border border-blue-100 flex items-center justify-center">
        <Mail className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-semibold text-gray-900">
          Link your email for receipts
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          Get contribution receipts and recover your account if you ever change your number.
        </p>
        <button
          type="button"
          onClick={onLink}
          disabled={busy}
          className="mt-2 inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60"
          data-testid="button-link-google"
        >
          {busy ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          ) : (
            <SiGoogle className="h-4 w-4 text-gray-700" />
          )}
          Continue with Google
        </button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-white"
        data-testid="button-dismiss-link-google"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
