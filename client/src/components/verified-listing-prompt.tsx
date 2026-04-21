import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import type { VerificationStatus } from "@shared/schema";

interface Props {
  groupId: string;
  isAdmin: boolean;
  adminId: string;
  status?: VerificationStatus;
}

// Auto-opens once, after a group is approved, asking the admin whether to keep the
// public listing on (default) or opt out. Only renders for the admin and only until
// they make a decision (publicListingDecisionAt is set).
export function VerifiedListingPrompt({ groupId, isAdmin, adminId, status }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const shouldShow = !!(
    isAdmin && status?.group?.verifiedAt && !status.group.publicListingDecisionAt
  );

  useEffect(() => {
    if (shouldShow) setOpen(true);
  }, [shouldShow]);

  const mutate = useMutation({
    mutationFn: async (publiclyListed: boolean) =>
      apiRequest("PATCH", `/api/groups/${groupId}/public-listing`, { userId: adminId, publiclyListed }),
    onSuccess: (_d, publiclyListed) => {
      toast({
        title: publiclyListed ? "Listed publicly" : "Hidden from public listing",
        description: publiclyListed
          ? "Your group will appear in the public Verified Ajo discovery strip."
          : "Your group is verified but won't appear in public discovery. You can change this in group settings later.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "verification"] });
      setOpen(false);
    },
    onError: () => {
      toast({ title: "Couldn't save", description: "Try again from group settings.", variant: "destructive" });
    },
  });

  if (!shouldShow) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!mutate.isPending) setOpen(v); }}>
      <DialogContent data-testid="verified-listing-prompt">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            You're a Verified Ajo Group
          </DialogTitle>
          <DialogDescription>
            Congrats — your verification was approved. One quick question before we close this:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>Should we list your group publicly so others in your area can discover and request to join?</p>
          <div className="rounded-md border bg-gray-50 p-3 space-y-1">
            <p className="font-medium flex items-center gap-1"><Eye className="w-4 h-4 text-green-600" /> List publicly (recommended)</p>
            <p className="text-xs text-gray-600">Your group name, state and LGA appear in the Verified Ajo discovery strip on the home page. New members still have to request and be approved.</p>
          </div>
          <div className="rounded-md border bg-gray-50 p-3 space-y-1">
            <p className="font-medium flex items-center gap-1"><EyeOff className="w-4 h-4 text-gray-600" /> Keep private</p>
            <p className="text-xs text-gray-600">Verified badge stays on your group, but you won't show up in public discovery. You can change this any time in group settings.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => mutate.mutate(false)} disabled={mutate.isPending} data-testid="button-listing-private">
            Keep private
          </Button>
          <Button onClick={() => mutate.mutate(true)} disabled={mutate.isPending} data-testid="button-listing-public">
            List publicly
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
