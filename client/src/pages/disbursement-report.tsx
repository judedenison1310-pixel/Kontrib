import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import {
  Loader2, Share2, Printer, AlertCircle, Users,
  Banknote, Receipt, ArrowDownCircle, CheckCircle2, ArrowLeft,
} from "lucide-react";
import kontribLogo from "@assets/8_1764455185903.png";

interface DisbursementReportData {
  group: { id: string; name: string; description?: string };
  project: {
    id: string;
    name: string;
    projectType: string;
    currency: string;
    targetAmount?: string | null;
    collectedAmount: string;
    status: string;
  };
  summary: {
    totalDisbursed: number;
    count: number;
  };
  disbursements: {
    id: string;
    recipient: string;
    purpose: string;
    amount: number;
    disbursementDate: string;
    hasReceipt: boolean;
  }[];
  generatedAt: string;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  target: "Target Goal",
  monthly: "Monthly Dues",
  yearly: "Yearly Levy",
  event: "Event",
  emergency: "Emergency",
};

export default function DisbursementReport() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: report, isLoading, error } = useQuery<DisbursementReportData>({
    queryKey: [`/api/disbursement-report/${projectId}`],
    enabled: !!projectId,
  });

  const handleShare = () => {
    if (!report) return;
    const url = window.location.href;
    const currency = (report.project.currency as CurrencyCode) || "NGN";
    const totalDisbursed = formatCurrency(report.summary.totalDisbursed, currency);

    const lines = [
      `💸 *${report.project.name} — Disbursement Report*`,
      `🏦 Group: ${report.group.name}`,
      ``,
      `💰 Total Disbursed: ${totalDisbursed}`,
      `📋 Transactions: ${report.summary.count}`,
      ``,
    ];

    if (report.disbursements.length > 0) {
      lines.push(`*Disbursements:*`);
      report.disbursements.slice(0, 5).forEach((d) => {
        lines.push(
          `• ${d.recipient} — ${formatCurrency(d.amount, currency)} (${d.purpose})`
        );
      });
      if (report.disbursements.length > 5) {
        lines.push(`...and ${report.disbursements.length - 5} more`);
      }
      lines.push(``);
    }

    lines.push(`View full report 👇`, url);

    window.open(
      `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank"
    );
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
          <p className="text-gray-500">
            This report link may be invalid or the project no longer exists.
          </p>
        </div>
      </div>
    );
  }

  const currency = (report.project.currency as CurrencyCode) || "NGN";
  const collected = Number(report.project.collectedAmount);
  const disbursed = report.summary.totalDisbursed;
  const remaining = Math.max(0, collected - disbursed);
  const generatedDate = new Date(report.generatedAt).toLocaleString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Action bar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <a
            href={`/project/${projectId}`}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="Back to project"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <img src={kontribLogo} alt="Kontrib" className="w-7 h-7" />
          <span className="font-bold text-gray-900 text-sm">Disbursement Report</span>
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
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                {report.group.name}
              </p>
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                {report.project.name}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Disbursement Report</p>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
                report.project.status === "active"
                  ? "bg-green-100 text-green-700"
                  : report.project.status === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {report.project.status.charAt(0).toUpperCase() +
                report.project.status.slice(1)}
            </span>
          </div>
          <span className="bg-gray-100 px-2.5 py-1 rounded-full text-xs text-gray-500">
            {PROJECT_TYPE_LABELS[report.project.projectType] ||
              report.project.projectType}
          </span>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-1">Collected</p>
            <p className="text-lg font-extrabold text-green-600">
              {formatCurrency(collected, currency)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-1">Disbursed</p>
            <p className="text-lg font-extrabold text-orange-500">
              {formatCurrency(disbursed, currency)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-1">Balance</p>
            <p className="text-lg font-extrabold text-gray-900">
              {formatCurrency(remaining, currency)}
            </p>
          </div>
        </div>

        {/* Disbursement list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-orange-500" />
              Disbursements
            </h2>
            <span className="text-sm font-semibold text-gray-500">
              {report.disbursements.length}
            </span>
          </div>

          {report.disbursements.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <Banknote className="h-8 w-8 text-gray-200 mx-auto" />
              <p className="text-gray-400 text-sm">No disbursements recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {report.disbursements.map((d, index) => (
                <div key={d.id} className="px-5 py-4 flex items-start gap-4">
                  {/* Index bubble */}
                  <div className="w-7 h-7 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {d.recipient}
                        </p>
                        <p className="text-sm text-gray-500 leading-snug mt-0.5">
                          {d.purpose}
                        </p>
                      </div>
                      <p className="font-bold text-orange-500 shrink-0 text-sm">
                        {formatCurrency(d.amount, currency)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-xs text-gray-400">
                        {new Date(d.disbursementDate).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      {d.hasReceipt && (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <Receipt className="h-3 w-3" />
                          Receipt attached
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total row */}
          {report.disbursements.length > 0 && (
            <div className="px-5 py-3 bg-orange-50 flex items-center justify-between border-t border-orange-100">
              <span className="text-sm font-bold text-gray-700">Total Disbursed</span>
              <span className="text-sm font-extrabold text-orange-600">
                {formatCurrency(disbursed, currency)}
              </span>
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

        {/* Kontrib CTA */}
        <div className="print:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-5 pb-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img src={kontribLogo} alt="Kontrib" className="w-7 h-7" />
              <span className="font-extrabold text-gray-900 text-base">Kontrib</span>
            </div>
            <p className="text-sm text-gray-500 leading-snug">
              Manage group savings with full transparency — track contributions,
              approve payments, and share progress in real time.
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

        {/* Print-only footer */}
        <div className="hidden print:block text-center py-4 border-t border-gray-200 mt-4">
          <p className="text-xs text-gray-400">
            Developed on{" "}
            <a href="https://kontrib.app" className="text-green-600 font-semibold">
              Kontrib.app
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
