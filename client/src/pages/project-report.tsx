import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { Loader2, CheckCircle2, Clock, Trophy, Share2, Printer, AlertCircle, Users } from "lucide-react";
import kontribLogo from "@assets/8_1764455185903.png";

interface ReportData {
  isPrivate: boolean;
  group: { id: string; name: string; description?: string };
  project: {
    id: string;
    name: string;
    projectType: string;
    currency: string;
    targetAmount?: string | null;
    collectedAmount: string;
    deadline?: string | null;
    status: string;
    description?: string | null;
  };
  summary: {
    totalConfirmed: number;
    totalPending: number;
    confirmedCount: number;
    pendingCount: number;
    progressPercent: number | null;
  };
  contributors: { rank: number; name: string; amount: number; date: string }[];
  generatedAt: string;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  target: "Target Goal",
  monthly: "Monthly Dues",
  yearly: "Yearly Levy",
  event: "Event",
  emergency: "Emergency",
};

export default function ProjectReport() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: report, isLoading, error } = useQuery<ReportData>({
    queryKey: [`/api/report/${projectId}`],
    enabled: !!projectId,
  });

  const handleShare = () => {
    if (!report) return;
    const url = window.location.href;
    const currency = (report.project.currency as CurrencyCode) || "NGN";
    const collected = formatCurrency(report.summary.totalConfirmed, currency);
    const target = report.project.targetAmount
      ? formatCurrency(Number(report.project.targetAmount), currency)
      : null;
    const progress = report.summary.progressPercent !== null
      ? `📊 Progress: ${report.summary.progressPercent}%\n` : "";

    const msg = [
      `📋 *${report.project.name} — Contribution Report*`,
      `🏦 Group: ${report.group.name}`,
      ``,
      `💰 Total Collected: ${collected}`,
      target ? `🎯 Target: ${target}` : null,
      progress.trim() || null,
      `👥 Contributors: ${report.summary.confirmedCount}`,
      ``,
      `View full report 👇`,
      url,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Report not found</h2>
          <p className="text-gray-500">This report link may be invalid or the project no longer exists.</p>
        </div>
      </div>
    );
  }

  const currency = (report.project.currency as CurrencyCode) || "NGN";
  const hasTarget = !!report.project.targetAmount && Number(report.project.targetAmount) > 0;
  const remaining = hasTarget
    ? Math.max(0, Number(report.project.targetAmount) - report.summary.totalConfirmed)
    : null;
  const generatedDate = new Date(report.generatedAt).toLocaleString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Action bar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <img src={kontribLogo} alt="Kontrib" className="w-7 h-7" />
          <span className="font-bold text-gray-900 text-sm">Kontrib Report</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share on WhatsApp
          </button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{report.group.name}</p>
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{report.project.name}</h1>
              {report.project.description && (
                <p className="text-sm text-gray-500 mt-1">{report.project.description}</p>
              )}
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
              report.project.status === "active"
                ? "bg-green-100 text-green-700"
                : report.project.status === "completed"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600"
            }`}>
              {report.project.status.charAt(0).toUpperCase() + report.project.status.slice(1)}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="bg-gray-100 px-2.5 py-1 rounded-full">
              {PROJECT_TYPE_LABELS[report.project.projectType] || report.project.projectType}
            </span>
            {report.project.deadline && (
              <span className="bg-gray-100 px-2.5 py-1 rounded-full">
                Deadline: {new Date(report.project.deadline).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Total Collected</p>
            <p className="text-2xl font-extrabold text-green-600">
              {formatCurrency(report.summary.totalConfirmed, currency)}
            </p>
          </div>

          {hasTarget ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Target</p>
              <p className="text-2xl font-extrabold text-gray-900">
                {formatCurrency(Number(report.project.targetAmount), currency)}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Contributors</p>
              <p className="text-2xl font-extrabold text-gray-900">{report.summary.confirmedCount}</p>
            </div>
          )}

          {hasTarget && (
            <>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Remaining</p>
                <p className="text-2xl font-extrabold text-orange-500">
                  {formatCurrency(remaining!, currency)}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Contributors</p>
                <p className="text-2xl font-extrabold text-gray-900">{report.summary.confirmedCount}</p>
              </div>
            </>
          )}
        </div>

        {/* Progress bar */}
        {report.summary.progressPercent !== null && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Progress</span>
              <span className="text-sm font-bold text-green-600">{report.summary.progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                style={{ width: `${report.summary.progressPercent}%` }}
              />
            </div>
            {report.summary.pendingCount > 0 && (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {report.summary.pendingCount} payment{report.summary.pendingCount > 1 ? "s" : ""} pending review
              </p>
            )}
          </div>
        )}

        {/* Contributors section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Contributors
            </h2>
            <span className="text-sm font-semibold text-gray-500">
              {report.summary.confirmedCount}
            </span>
          </div>

          {report.isPrivate ? (
            /* Private group — aggregate only, no names */
            <div className="px-5 py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                <Users className="h-7 w-7 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {report.summary.confirmedCount} member{report.summary.confirmedCount !== 1 ? "s" : ""} contributed
                </p>
                {report.summary.pendingCount > 0 && (
                  <p className="text-sm text-gray-400 mt-0.5">
                    {report.summary.pendingCount} pending review
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Member identities are kept private in this group. Only the admin can view individual records.
              </p>
            </div>
          ) : report.contributors.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-400 text-sm">No confirmed contributions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {report.contributors.map((c) => (
                <div key={c.rank} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    c.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                    c.rank === 2 ? "bg-gray-100 text-gray-600" :
                    c.rank === 3 ? "bg-orange-100 text-orange-600" :
                    "bg-gray-50 text-gray-500"
                  }`}>
                    {c.rank <= 3 ? <Trophy className="h-3.5 w-3.5" /> : c.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.date).toLocaleDateString("en-NG", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="font-bold text-green-600 shrink-0">
                    {formatCurrency(c.amount, currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Share CTA */}
        <div className="print:hidden text-center">
          <button
            onClick={handleShare}
            className="mx-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share this Report on WhatsApp
          </button>
        </div>

        {/* Kontrib channel — visible to anyone viewing the public report */}
        <div className="print:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-5 pb-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img src={kontribLogo} alt="Kontrib" className="w-7 h-7" />
              <span className="font-extrabold text-gray-900 text-base">Kontrib</span>
            </div>
            <p className="text-sm text-gray-500 leading-snug">
              Manage group savings with full transparency — track contributions, approve payments, and share progress in real time.
            </p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <a
              href="/"
              className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-green-600 text-white text-center hover:bg-green-700 transition-colors"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs font-bold leading-tight">Start Your Group</span>
              <span className="text-[10px] opacity-80 leading-tight">Free to get started</span>
            </a>
            <a
              href="/"
              className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-gray-900 text-white text-center hover:bg-gray-800 transition-colors"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-xs font-bold leading-tight">Log In</span>
              <span className="text-[10px] opacity-60 leading-tight">Access your account</span>
            </a>
          </div>
        </div>

        {/* Generated timestamp */}
        <div className="text-center pb-6">
          <p className="text-xs text-gray-400">Report generated {generatedDate}</p>
        </div>
      </main>
    </div>
  );
}
