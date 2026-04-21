import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { User as UserType } from "@shared/schema";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
];

interface GroupMemberWithUser {
  id: string; groupId: string; userId: string; status: string; user: UserType;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  adminId: string;
  members: GroupMemberWithUser[];
}

export function VerificationApplyModal({ open, onOpenChange, groupId, adminId, members }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [adminLegalName, setAdminLegalName] = useState("");
  const [adminSelfie, setAdminSelfie] = useState("");
  const [selfieError, setSelfieError] = useState<string | null>(null);
  const [officerNominees, setOfficerNominees] = useState<string[]>([]);
  const [attesterMap, setAttesterMap] = useState<Record<string, UserType>>({});
  const attesters = useMemo(() => Object.keys(attesterMap), [attesterMap]);
  const [attesterPhone, setAttesterPhone] = useState("");
  const [attesterLookup, setAttesterLookup] = useState<UserType | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const eligibleOfficers = useMemo(
    () => members.filter(m => m.userId !== adminId && m.status === "active"),
    [members, adminId]
  );

  function reset() {
    setStep(1); setState(""); setLga(""); setOfficerNominees([]);
    setAdminLegalName(""); setAdminSelfie(""); setSelfieError(null);
    setAttesterMap({}); setAttesterPhone(""); setAttesterLookup(null); setLookupError(null);
  }

  function handleSelfieFile(file: File | null) {
    setSelfieError(null);
    if (!file) { setAdminSelfie(""); return; }
    if (file.size > 4 * 1024 * 1024) { setSelfieError("Selfie must be smaller than 4MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setAdminSelfie(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => setSelfieError("Could not read that image.");
    reader.readAsDataURL(file);
  }

  const submit = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/groups/${groupId}/verification`, {
        submittedBy: adminId, state, lga,
        adminLegalName, adminSelfie,
        officerNominees, attesters,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "verification"] });
      toast({ title: "Application submitted", description: "We'll review and follow up within 3 business days." });
      reset();
      onOpenChange(false);
    },
    onError: async (err: any) => {
      let msg = "Could not submit application";
      try { const body = await err?.response?.json?.(); if (body?.message) msg = body.message; } catch {}
      if (typeof err?.message === "string") msg = err.message.replace(/^\d+:\s*/, "");
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
    },
  });

  async function lookupAttester() {
    setLookupError(null); setAttesterLookup(null);
    if (!attesterPhone.trim()) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/users/by-phone/${encodeURIComponent(attesterPhone.trim())}`);
      if (!res.ok) {
        setLookupError("No Kontrib user found with that phone number.");
        return;
      }
      const u = (await res.json()) as UserType;
      if (attesterMap[u.id]) { setLookupError("Already added."); return; }
      if (u.id === adminId) { setLookupError("You can't vouch for your own group."); return; }
      if (officerNominees.includes(u.id)) { setLookupError("This person is already a nominated officer."); return; }
      setAttesterLookup(u);
    } catch {
      setLookupError("Lookup failed.");
    } finally { setLookupLoading(false); }
  }

  function addAttester() {
    if (!attesterLookup) return;
    setAttesterMap(prev => ({ ...prev, [attesterLookup.id]: attesterLookup }));
    setAttesterPhone(""); setAttesterLookup(null);
  }
  function removeAttester(uid: string) {
    setAttesterMap(prev => { const next = { ...prev }; delete next[uid]; return next; });
  }

  const canNext =
    (step === 1 && state && lga.trim().length >= 2) ||
    (step === 2 && officerNominees.length === 2 && adminLegalName.trim().length >= 2 && adminSelfie.length >= 20) ||
    (step === 3 && attesters.length >= 5) ||
    step === 4;

  const attesterUserMap = useMemo(() => {
    const m = new Map<string, UserType>();
    if (attesterLookup) m.set(attesterLookup.id, attesterLookup);
    // We don't have full user objects for added attesters; we'll show phone-based labels via a side cache
    return m;
  }, [attesterLookup]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-verification-apply">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            Apply for Verified Ajo · Step {step} of 4
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Where does this group meet? We use this to match you with people in your area.</p>
            <div>
              <Label>State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger data-testid="select-verification-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{NIGERIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>LGA / Town</Label>
              <Input value={lga} onChange={e => setLga(e.target.value)} placeholder="e.g. Surulere" data-testid="input-verification-lga" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">You're the 3rd officer. Confirm your full legal name and add a clear selfie so reviewers can match it to your phone number.</p>
            <div>
              <Label>Your full legal name</Label>
              <Input value={adminLegalName} onChange={e => setAdminLegalName(e.target.value)}
                placeholder="As it appears on your ID" data-testid="input-admin-legal-name" />
            </div>
            <div>
              <Label>Your selfie</Label>
              <Input type="file" accept="image/*" onChange={e => handleSelfieFile(e.target.files?.[0] ?? null)}
                data-testid="input-admin-selfie" />
              {selfieError && <p className="text-xs text-red-600 mt-1">{selfieError}</p>}
              {adminSelfie && (
                <img src={adminSelfie} alt="Your selfie preview" className="mt-2 h-24 w-24 rounded object-cover border" />
              )}
            </div>
            <div className="border-t pt-4" />
            <p className="text-sm text-gray-600">Now pick <strong>2 co-officers</strong> from your group. They'll be asked to confirm their own legal name and selfie.</p>
            {eligibleOfficers.length < 2 ? (
              <p className="text-sm text-orange-600">You need at least 2 other active members to nominate officers.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
                {eligibleOfficers.map(m => {
                  const checked = officerNominees.includes(m.userId);
                  return (
                    <label key={m.userId} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          if (v) {
                            if (officerNominees.length >= 2) return;
                            setOfficerNominees([...officerNominees, m.userId]);
                          } else {
                            setOfficerNominees(officerNominees.filter(id => id !== m.userId));
                          }
                        }}
                        data-testid={`checkbox-officer-${m.userId}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{m.user.fullName || "Unnamed member"}</div>
                        <div className="text-xs text-gray-500">{m.user.phoneNumber}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-gray-500">{officerNominees.length}/2 selected</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Add <strong>at least 5 Kontrib members</strong> who'll vouch that you and your group are real. They can be from any group.</p>
            <div className="flex gap-2">
              <Input value={attesterPhone} onChange={e => setAttesterPhone(e.target.value)}
                placeholder="Phone number (e.g. 0803...)"
                data-testid="input-attester-phone" />
              <Button type="button" variant="outline" onClick={lookupAttester} disabled={lookupLoading} data-testid="button-lookup-attester">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}
            {attesterLookup && (
              <div className="flex items-center justify-between border rounded-md p-2 bg-green-50">
                <div>
                  <div className="font-medium">{attesterLookup.fullName || "Unnamed user"}</div>
                  <div className="text-xs text-gray-500">{attesterLookup.phoneNumber}</div>
                </div>
                <Button size="sm" onClick={addAttester} data-testid="button-add-attester">Add</Button>
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-1">Added ({attesters.length}/5+)</p>
              {attesters.length === 0 ? (
                <p className="text-xs text-gray-500">No attesters added yet.</p>
              ) : (
                <div className="space-y-1">
                  {attesters.map(uid => {
                    const u = attesterMap[uid];
                    return (
                      <div key={uid} className="flex items-center justify-between border rounded p-2 text-sm">
                        <div>
                          <div className="font-medium">{u.fullName || "Unnamed user"}</div>
                          <div className="text-xs text-gray-500">{u.phoneNumber}</div>
                        </div>
                        <button onClick={() => removeAttester(uid)} className="text-red-600" data-testid={`button-remove-attester-${uid}`}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">Review and submit. Our team reviews within 3 business days.</p>
            <div className="border rounded-md p-3 space-y-2">
              <div><span className="text-gray-500">Location:</span> <strong>{lga}, {state}</strong></div>
              <div><span className="text-gray-500">Officers:</span> <strong>You + {officerNominees.length} nominated</strong></div>
              <div><span className="text-gray-500">Attesters:</span> <strong>{attesters.length}</strong></div>
            </div>
            <p className="text-xs text-gray-500">By submitting, you agree to be contacted for follow-up questions and that nominated officers will be asked for a legal name + selfie.</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="button-verification-back">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext} data-testid="button-verification-next">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => submit.mutate()} disabled={submit.isPending} data-testid="button-verification-submit">
              {submit.isPending ? "Submitting..." : "Submit application"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
