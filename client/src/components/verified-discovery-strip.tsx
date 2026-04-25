import { ShieldCheck, MapPin, Users } from "lucide-react";

interface Props {
  userId?: string | null;
  state?: string | null;
  lga?: string | null;
}

// Phase 4 — Discovery is being rebuilt. Until the new flow ships, the strip
// renders a row of inactive placeholder cards so members know it's coming
// without any real groups being clickable from here.
export function VerifiedDiscoveryStrip(_props: Props) {
  const placeholders = [0, 1, 2];

  return (
    <section data-testid="verified-discovery-strip" className="space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            Verified groups near you
          </h2>
          <p className="text-xs text-gray-500">Trusted Ajo groups you can request to join</p>
        </div>
      </div>
      <div className="-mx-4 px-4 overflow-x-auto pb-1">
        <div className="flex gap-3 min-w-min">
          {placeholders.map((i) => (
            <div
              key={i}
              aria-disabled="true"
              className="shrink-0 w-56 bg-gray-50 border border-gray-200 rounded-xl p-3 opacity-70 cursor-not-allowed select-none"
              data-testid={`discovery-card-placeholder-${i}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <p className="font-semibold text-sm text-gray-400 truncate">Group Name</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    City, State
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center bg-gray-200 text-gray-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Coming soon
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" /> — members
                </span>
                <span className="text-xs text-gray-400">Unavailable</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
