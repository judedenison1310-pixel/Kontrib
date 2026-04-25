// Phase 4 — Push notification debugger.
// Pick a user (search), then send a test push and view per-subscription
// success/failure so the team can verify whether their device is reachable.

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bell, Search, Loader2, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { opsFetch } from "./ops-shared";

type UserHit = { id: string; fullName: string | null; phoneNumber: string };
type Result = { endpoint: string; ok: boolean };
type SendResp = { ok: boolean; sent: number; total?: number; results: Result[]; message?: string };

export function PushTestPanel() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [target, setTarget] = useState<UserHit | null>(null);
  const [title, setTitle] = useState("Kontrib test push");
  const [body, setBody] = useState("This is a test push from Kontrib ops.");
  const [url, setUrl] = useState("/");
  const [lastResult, setLastResult] = useState<SendResp | null>(null);

  const searchQ = useQuery<{ users: UserHit[] }>({
    queryKey: ["/api/ops/users/search", "push", submitted],
    queryFn: () => opsFetch("GET", `/api/ops/users/search?q=${encodeURIComponent(submitted)}&limit=10`),
    enabled: submitted.length > 0,
  });

  const sendMut = useMutation({
    mutationFn: async () =>
      opsFetch<SendResp>("POST", "/api/ops/push-test", {
        userId: target?.id,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || "/",
      }),
    onSuccess: (data) => {
      setLastResult(data);
      if (data.sent > 0) toast({ title: `Sent to ${data.sent}/${data.total ?? data.results.length} subscription${data.sent === 1 ? "" : "s"}` });
      else toast({ title: "No push delivered", description: data.message || "All subscriptions failed", variant: "destructive" });
    },
    onError: (err: any) => toast({ title: "Send failed", description: err?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-white flex items-center gap-2"><Bell className="h-4 w-4" /> Recipient</p>
          {target ? (
            <div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm text-white">{target.fullName || target.phoneNumber}</p>
                <p className="text-xs text-gray-500">{target.id}</p>
              </div>
              <button onClick={() => setTarget(null)} className="text-xs text-gray-400 hover:text-white" data-testid="button-push-clear-target">Change</button>
            </div>
          ) : (
            <>
              <form
                onSubmit={(e) => { e.preventDefault(); setSubmitted(search.trim()); }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, phone, or user ID"
                    className="pl-9 bg-gray-800 border-gray-700 text-white"
                    data-testid="input-push-search"
                  />
                </div>
                <Button type="submit" className="bg-primary" data-testid="button-push-search">Search</Button>
              </form>

              {searchQ.isLoading && <p className="text-xs text-gray-500">Searching…</p>}
              {searchQ.data?.users && searchQ.data.users.length === 0 && (
                <p className="text-xs text-gray-500">No matches.</p>
              )}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(searchQ.data?.users || []).map(u => (
                  <button
                    key={u.id}
                    onClick={() => setTarget(u)}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2"
                    data-testid={`button-push-pick-${u.id}`}
                  >
                    <p className="text-sm text-white">{u.fullName || "(no name)"}</p>
                    <p className="text-xs text-gray-500">{u.phoneNumber}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Payload</p>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-gray-800 border-gray-700 text-white" data-testid="input-push-title" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Body</label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className="bg-gray-800 border-gray-700 text-white" data-testid="textarea-push-body" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">URL on click</label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="/" className="bg-gray-800 border-gray-700 text-white" data-testid="input-push-url" />
          </div>

          <Button
            onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending || !target || !title.trim() || !body.trim()}
            className="bg-primary text-white w-full"
            data-testid="button-push-send"
          >
            {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" /> Send test push</>}
          </Button>
        </CardContent>
      </Card>

      {lastResult && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-white">Last result</p>
            {lastResult.message && <p className="text-xs text-amber-300">{lastResult.message}</p>}
            <p className="text-xs text-gray-400">{lastResult.sent}/{lastResult.total ?? lastResult.results.length} succeeded</p>
            <div className="space-y-1">
              {lastResult.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-gray-800 rounded px-2 py-1.5">
                  {r.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    : <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                  <span className="text-gray-300 truncate">{r.endpoint}</span>
                  <span className={`ml-auto ${r.ok ? "text-green-400" : "text-red-400"}`}>{r.ok ? "delivered" : "failed (removed)"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
