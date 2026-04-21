import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Camera, Check, X, ChevronDown } from "lucide-react";
import type { VerificationInbox as VerificationInboxType } from "@shared/schema";

interface Props {
  userId: string;
}

export function VerificationInbox({ userId }: Props) {
  const { data, isLoading } = useQuery<VerificationInboxType>({
    queryKey: ["/api/users", userId, "verification-inbox"],
    enabled: !!userId,
  });

  if (isLoading || !data) return null;
  const { officerInvites, attesterInvites } = data;
  if (officerInvites.length === 0 && attesterInvites.length === 0) return null;

  return (
    <Card className="border-blue-200 bg-blue-50" data-testid="verification-inbox">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Verification requests</h3>
          <Badge variant="secondary">{officerInvites.length + attesterInvites.length}</Badge>
        </div>
        <div className="space-y-2">
          {officerInvites.map(invite => (
            <OfficerInviteCard key={invite.applicationId} userId={userId} invite={invite} />
          ))}
          {attesterInvites.map(invite => (
            <AttesterInviteCard key={invite.applicationId} userId={userId} invite={invite} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Officer card with inline accept form ---
function OfficerInviteCard({ userId, invite }: { userId: string; invite: VerificationInboxType["officerInvites"][number] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [selfie, setSelfie] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const respond = useMutation({
    mutationFn: async (body: any) =>
      apiRequest("POST", `/api/verification-applications/${invite.applicationId}/officer-response`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "verification-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", invite.group.id, "verification"] });
      toast({ title: "Response saved", description: "Thanks — the group admin will be notified." });
    },
    onError: async (err: any) => {
      let msg = "Could not save response";
      try { const body = await err?.response?.json?.(); if (body?.message) msg = body.message; } catch {}
      if (typeof err?.message === "string") msg = err.message.replace(/^\d+:\s*/, "");
      toast({ title: "Failed", description: msg, variant: "destructive" });
    },
  });

  function pickFile() { fileInputRef.current?.click(); }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "Selfie too large", description: "Please pick an image under 5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSelfie(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(f);
  }

  function handleAccept() {
    if (!legalName || legalName.trim().length < 2) {
      toast({ title: "Enter your legal name", variant: "destructive" });
      return;
    }
    if (!selfie) {
      toast({ title: "Take a selfie", description: "We need a quick photo to confirm it's you.", variant: "destructive" });
      return;
    }
    respond.mutate({ userId, action: "accept", legalName: legalName.trim(), selfie });
  }

  return (
    <div className="bg-white rounded-md border p-3 space-y-2" data-testid={`officer-invite-${invite.applicationId}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            <strong>{invite.group.name}</strong> nominated you as a co-officer
          </p>
          <p className="text-xs text-gray-500">Confirm your legal name and add a selfie to support their Verified Ajo application.</p>
        </div>
        {!open && (
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)} data-testid={`button-officer-open-${invite.applicationId}`}>
            <ChevronDown className="w-4 h-4" />
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-2 pt-2 border-t">
          <div>
            <Label className="text-xs">Legal name (as on ID)</Label>
            <Input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="e.g. Adaobi Okechukwu Nwosu"
              data-testid={`input-officer-legalname-${invite.applicationId}`} />
          </div>
          <div>
            <Label className="text-xs">Selfie</Label>
            <input ref={fileInputRef} type="file" accept="image/*" capture="user" onChange={onFile} className="hidden" />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={pickFile} data-testid={`button-officer-selfie-${invite.applicationId}`}>
                <Camera className="w-4 h-4 mr-1" /> {selfie ? "Retake" : "Take selfie"}
              </Button>
              {selfie && <img src={selfie} alt="Selfie" className="h-12 w-12 object-cover rounded-md border" />}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="ghost"
              onClick={() => respond.mutate({ userId, action: "decline" })}
              disabled={respond.isPending}
              data-testid={`button-officer-decline-${invite.applicationId}`}>
              <X className="w-4 h-4 mr-1" /> Decline
            </Button>
            <Button size="sm" onClick={handleAccept} disabled={respond.isPending}
              data-testid={`button-officer-accept-${invite.applicationId}`}>
              <Check className="w-4 h-4 mr-1" /> Accept
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Attester card: Vouch / Decline only ---
function AttesterInviteCard({ userId, invite }: { userId: string; invite: VerificationInboxType["attesterInvites"][number] }) {
  const { toast } = useToast();
  const respond = useMutation({
    mutationFn: async (action: "vouch" | "decline") =>
      apiRequest("POST", `/api/verification-applications/${invite.applicationId}/attester-response`, { userId, action }),
    onSuccess: (_d, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "verification-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", invite.group.id, "verification"] });
      toast({ title: action === "vouch" ? "Thanks for vouching" : "Marked as declined" });
    },
    onError: async (err: any) => {
      let msg = "Could not save response";
      try { const body = await err?.response?.json?.(); if (body?.message) msg = body.message; } catch {}
      if (typeof err?.message === "string") msg = err.message.replace(/^\d+:\s*/, "");
      toast({ title: "Failed", description: msg, variant: "destructive" });
    },
  });

  return (
    <div className="bg-white rounded-md border p-3 flex items-center gap-3" data-testid={`attester-invite-${invite.applicationId}`}>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">
          <strong>{invite.group.name}</strong> is asking you to vouch
        </p>
        <p className="text-xs text-gray-500">
          Run by {invite.admin.fullName || "an admin"}. Only vouch if you trust them and the group is real.
        </p>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => respond.mutate("decline")} disabled={respond.isPending}
          data-testid={`button-attester-decline-${invite.applicationId}`}>
          <X className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={() => respond.mutate("vouch")} disabled={respond.isPending}
          data-testid={`button-attester-vouch-${invite.applicationId}`}>
          <Check className="w-4 h-4 mr-1" /> Vouch
        </Button>
      </div>
    </div>
  );
}
