"use client";

import React from "react";
import {
  Calendar,
  CheckCircle2,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Pause,
  Pencil,
  Play,
  Share2,
} from "lucide-react";

const CHANNEL_META: Record<
  string,
  { label: string; bg: string; color: string; solid?: boolean }
> = {
  WHATSAPP: {
    label: "WhatsApp",
    bg: "bg-[#22C55E] border-[#22C55E]",
    color: "text-white",
    solid: true,
  },
  META_ADS: {
    label: "Meta Ads",
    bg: "bg-blue-50 border-blue-200/80",
    color: "text-[#0081FB]",
  },
  GOOGLE_ADS: {
    label: "Google Ads",
    bg: "bg-amber-50 border-amber-200/80",
    color: "text-amber-600",
  },
  EMAIL: {
    label: "Email",
    bg: "bg-violet-50 border-violet-200/80",
    color: "text-violet-600",
  },
  SMS: {
    label: "SMS",
    bg: "bg-sky-50 border-sky-200/80",
    color: "text-sky-600",
  },
  INSTAGRAM: {
    label: "Instagram",
    bg: "bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 border-transparent",
    color: "text-white",
    solid: true,
  },
  FACEBOOK: {
    label: "Facebook",
    bg: "bg-[#1877F2] border-[#1877F2]",
    color: "text-white",
    solid: true,
  },
  LINKEDIN: {
    label: "LinkedIn",
    bg: "bg-cyan-50 border-cyan-200/80",
    color: "text-cyan-700",
  },
  LINKEDIN_ADS: {
    label: "LinkedIn Ads",
    bg: "bg-cyan-50 border-cyan-200/80",
    color: "text-cyan-700",
  },
  TIKTOK_ADS: {
    label: "TikTok Ads",
    bg: "bg-slate-900 border-slate-900",
    color: "text-white",
    solid: true,
  },
  X: {
    label: "X (Twitter)",
    bg: "bg-slate-900 border-slate-900",
    color: "text-white",
    solid: true,
  },
  YOUTUBE: {
    label: "YouTube",
    bg: "bg-rose-600 border-rose-600",
    color: "text-white",
    solid: true,
  },
  DIRECT: {
    label: "Direct",
    bg: "bg-slate-100 border-slate-200",
    color: "text-slate-600",
  },
};

export function MetaInfinityIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 14" fill="none" className={className} aria-hidden="true">
      <path
        d="M7.2 2C4.6 2 2.5 4.3 2.5 7C2.5 9.7 4.4 12 6.8 12C9 12 10.6 10.1 12 7.2C13.4 4.3 15 2 17.2 2C19.6 2 21.5 4.3 21.5 7C21.5 9.7 19.4 12 16.8 12C14.7 12 13.3 10.5 12 8"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChannelBadge({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel] ?? {
    label: channel.replaceAll("_", " "),
    bg: "bg-slate-50 border-slate-200",
    color: "text-slate-700",
  };

  const renderIcon = () => {
    switch (channel) {
      case "WHATSAPP":
        return <MessageCircle className={`h-4 w-4 ${meta.color}`} />;
      case "META_ADS":
        return <MetaInfinityIcon className={`h-4 w-4 ${meta.color}`} />;
      case "EMAIL":
        return <Mail className={`h-4 w-4 ${meta.color}`} />;
      case "SMS":
        return <MessageSquare className={`h-4 w-4 ${meta.color}`} />;
      case "INSTAGRAM":
        return <Instagram className={`h-4 w-4 ${meta.color}`} />;
      case "LINKEDIN":
      case "LINKEDIN_ADS":
        return <Linkedin className={`h-4 w-4 ${meta.color}`} />;
      case "GOOGLE_ADS":
      case "TIKTOK_ADS":
        return <Megaphone className={`h-4 w-4 ${meta.color}`} />;
      case "FACEBOOK":
      case "X":
      case "YOUTUBE":
        return <Share2 className={`h-4 w-4 ${meta.color}`} />;
      default:
        return <Globe className={`h-4 w-4 ${meta.color}`} />;
    }
  };

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold text-slate-700">
      <span
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${meta.bg}`}
      >
        {renderIcon()}
      </span>
      <span>{meta.label}</span>
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    MARKETING: "bg-[#EFE8FF] text-[#6D28D9] border-[#E0D4FF]",
    UTILITY: "bg-[#FEF3D6] text-[#B45309] border-[#FDE6AF]",
    PROMOTIONAL: "bg-[#FCE7F3] text-[#BE185D] border-[#FBCFE8]",
    TRANSACTIONAL: "bg-sky-50 text-sky-700 border-sky-200",
    AWARENESS: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  const cls = styles[type] ?? "bg-slate-50 text-slate-700 border-slate-200";
  const label = type.charAt(0) + type.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
    PUBLISHED: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
    SENT: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
    CONNECTED: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
    WON: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
    ACTIVE: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]",
    QUALIFIED: "bg-violet-50 text-violet-700 border-violet-200",
    SCHEDULED: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
    PROPOSAL: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
    CONTACTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
    PAUSED: "bg-orange-50 text-orange-700 border-orange-200",
    NEW: "bg-blue-50 text-blue-700 border-blue-200",
    DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
    DISCONNECTED: "bg-slate-100 text-slate-600 border-slate-200",
    LOST: "bg-rose-50 text-rose-700 border-rose-200",
    ERROR: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const cls = styles[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const label = status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

const CLEAN_CHANNEL_COLOR: Record<string, string> = {
  WHATSAPP: "text-[#22C55E]",
  EMAIL: "text-[#7C3AED]",
  SMS: "text-[#0284C7]",
  META_ADS: "text-[#0081FB]",
  GOOGLE_ADS: "text-[#16A34A]",
  INSTAGRAM: "text-[#EC4899]",
  FACEBOOK: "text-[#1877F2]",
  LINKEDIN: "text-[#0A66C2]",
  LINKEDIN_ADS: "text-[#0A66C2]",
};

export function CampaignChannelCell({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel] ?? {
    label: channel.replaceAll("_", " "),
    bg: "bg-slate-50 border-slate-200",
    color: "text-slate-700",
  };
  const iconColor = CLEAN_CHANNEL_COLOR[channel] ?? "text-slate-600";

  const renderIcon = () => {
    switch (channel) {
      case "WHATSAPP":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${iconColor}`} aria-hidden="true">
            <path
              d="M12 3.25a8.75 8.75 0 0 0-7.56 13.15L3.3 20.7l4.42-1.14A8.75 8.75 0 1 0 12 3.25Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.4 9.1c.2-.45.42-.46.65-.47h.55c.18 0 .42.06.64.52.23.48.77 1.66.84 1.78.07.12.11.27.02.44-.09.17-.14.28-.27.43-.13.15-.28.34-.4.46-.13.13-.27.27-.11.53.16.26.71 1.17 1.52 1.89 1.04.93 1.92 1.22 2.19 1.36.27.14.43.11.59-.07.16-.18.67-.78.85-1.05.18-.27.36-.22.6-.13.25.09 1.57.74 1.84.88.27.14.45.2.52.31.07.11.07.66-.16 1.3-.23.64-1.35 1.22-1.88 1.29-.48.07-1.09.1-1.76-.11-.41-.13-.93-.31-1.6-.6-2.8-1.2-4.62-4.01-4.76-4.2-.14-.19-1.14-1.52-1.14-2.9 0-1.38.72-2.06.98-2.34Z"
              fill="currentColor"
            />
          </svg>
        );
      case "META_ADS":
        return <MetaInfinityIcon className={`h-5 w-5 ${iconColor}`} />;
      case "EMAIL":
        return <Mail className={`h-5 w-5 ${iconColor}`} strokeWidth={1.9} />;
      case "SMS":
        return <MessageSquare className={`h-5 w-5 ${iconColor}`} strokeWidth={1.9} />;
      case "INSTAGRAM":
        return <Instagram className={`h-5 w-5 ${iconColor}`} strokeWidth={1.9} />;
      case "LINKEDIN":
      case "LINKEDIN_ADS":
        return <Linkedin className={`h-5 w-5 ${iconColor}`} strokeWidth={1.9} />;
      case "GOOGLE_ADS":
      case "TIKTOK_ADS":
        return <Megaphone className={`h-5 w-5 ${iconColor}`} strokeWidth={1.9} />;
      case "FACEBOOK":
      case "X":
      case "YOUTUBE":
        return <Share2 className={`h-5 w-5 ${iconColor}`} strokeWidth={1.9} />;
      default:
        return <Globe className={`h-5 w-5 ${iconColor}`} strokeWidth={1.9} />;
    }
  };

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap text-[13px] font-medium text-slate-800">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
        {renderIcon()}
      </span>
      <span>{meta.label}</span>
    </span>
  );
}

const CAMPAIGN_STATUS_META: Record<
  string,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }
> = {
  DRAFT: {
    label: "Draft",
    cls: "bg-[#EDE7FE] text-[#6D28D9]",
    icon: Pencil,
  },
  SCHEDULED: {
    label: "Scheduled",
    cls: "bg-[#FEF0D5] text-[#B45309]",
    icon: Calendar,
  },
  ACTIVE: {
    label: "Active",
    cls: "bg-[#DCFCE7] text-[#15803D]",
    icon: Play,
  },
  COMPLETED: {
    label: "Completed",
    cls: "bg-[#DBEAFE] text-[#0369A1]",
    icon: CheckCircle2,
  },
  PAUSED: {
    label: "Paused",
    cls: "bg-[#FFEDD5] text-[#C2410C]",
    icon: Pause,
  },
};

export function CampaignStatusPill({ status }: { status: string }) {
  const meta = CAMPAIGN_STATUS_META[status] ?? {
    label: status.charAt(0) + status.slice(1).toLowerCase(),
    cls: "bg-slate-100 text-slate-700",
    icon: CheckCircle2,
  };
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${meta.cls}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.1} />
      <span>{meta.label}</span>
    </span>
  );
}
