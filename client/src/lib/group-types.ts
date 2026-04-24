import { Repeat, ScrollText, Gift, type LucideIcon } from "lucide-react";
import type { GroupType } from "@shared/schema";

export type GroupTypeMeta = {
  type: GroupType;
  label: string;
  shortLabel: string;
  tagline: string;
  blurb: string;
  example: string;
  icon: LucideIcon;
  accentBg: string;
  accentText: string;
  badgeBg: string;
  badgeText: string;
};

export const GROUP_TYPE_META: Record<GroupType, GroupTypeMeta> = {
  ajo: {
    type: "ajo",
    label: "Ajo / Esusu",
    shortLabel: "Ajo",
    tagline: "Rotating savings",
    blurb: "Everyone contributes a fixed amount each cycle. Members take turns receiving the lump sum.",
    example: "e.g. Office Ajo, Market women's Esusu",
    icon: Repeat,
    accentBg: "bg-emerald-50 border-emerald-200",
    accentText: "text-emerald-700",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
  },
  association: {
    type: "association",
    label: "Association Dues & Levies",
    shortLabel: "Association",
    tagline: "Recurring dues",
    blurb: "Members pay regular dues — monthly or yearly — plus one-off levies set by the association.",
    example: "e.g. Alumni body, Town union, Trade association",
    icon: ScrollText,
    accentBg: "bg-blue-50 border-blue-200",
    accentText: "text-blue-700",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
  },
  project: {
    type: "project",
    label: "Project Funds",
    shortLabel: "Project",
    tagline: "Friends & family",
    blurb: "Collect for a one-off goal — a wedding gift, a friend's medical bill, a family project.",
    example: "e.g. Chioma's wedding, Help Tunde, Mum's birthday",
    icon: Gift,
    accentBg: "bg-amber-50 border-amber-200",
    accentText: "text-amber-700",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
};

export const GROUP_TYPE_ORDER: GroupType[] = ["ajo", "association", "project"];

export function metaForGroupType(t: string | null | undefined): GroupTypeMeta {
  if (t && (t in GROUP_TYPE_META)) return GROUP_TYPE_META[t as GroupType];
  return GROUP_TYPE_META.project;
}
