"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  Camera,
  ChevronDown,
  CornerDownLeft,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Italic,
  List,
  MessageCircle,
  MessageSquare,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  Share2,
  SlidersHorizontal,
  Smile,
  Strikethrough,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { ChannelBadge } from "@/components/ChannelBadge";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { getCurrencyMeta, toMinorUnits } from "@/lib/format";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
} from "@/lib/validation";

type ChannelValue = (typeof CAMPAIGN_CHANNELS)[number];
type CampaignTypeValue = (typeof CAMPAIGN_TYPES)[number];
type CampaignStatusValue = (typeof CAMPAIGN_STATUSES)[number];
type ActionTypeValue = "VISIT_WEBSITE" | "CALL_PHONE" | "QUICK_REPLY";

export interface CampaignActionDraft {
  id: string;
  type: ActionTypeValue;
  label: string;
  url: string;
}

const CHANNEL_LABELS: Record<ChannelValue, string> = {
  WHATSAPP: "WhatsApp",
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  EMAIL: "Email",
  SMS: "SMS",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
};

const TYPE_LABELS: Record<CampaignTypeValue, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utility",
  PROMOTIONAL: "Promotional",
  TRANSACTIONAL: "Transactional",
  AWARENESS: "Awareness",
};

const ACTION_TYPE_OPTIONS: Array<{
  value: ActionTypeValue;
  label: string;
  placeholder: string;
  targetPlaceholder: string;
}> = [
  {
    value: "VISIT_WEBSITE",
    label: "Visit website",
    placeholder: "e.g., Shop collection",
    targetPlaceholder: "https://yourbrand.com/offer (optional)",
  },
  {
    value: "CALL_PHONE",
    label: "Call phone",
    placeholder: "e.g., Call store",
    targetPlaceholder: "+14155552671 (optional)",
  },
  {
    value: "QUICK_REPLY",
    label: "Quick reply",
    placeholder: "e.g., Interested",
    targetPlaceholder: "",
  },
];

const STUDIO_MEDIA_PRESETS = [
  {
    id: "festive",
    label: "Festive Jewellery",
    src: "/images/campaign-festive-jewellery.jpg",
  },
  {
    id: "product",
    label: "Product Launch",
    src: "/images/campaign-product-launch.jpg",
  },
];

const EMOJI_PALETTE = [
  "✨",
  "🎉",
  "🛍️",
  "💎",
  "🔥",
  "🚀",
  "💜",
  "👋",
  "🎁",
  "⚡",
  "🌟",
  "✅",
];

function renderFormattedLine(line: string, lineIdx: number): React.ReactNode {
  const tokenRegex = /(\*[^*]+\*|_[^_]+_|~[^~]+~)/g;
  const parts = line.split(tokenRegex);

  return (
    <React.Fragment key={lineIdx}>
      {parts.map((part, idx) => {
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return (
            <strong key={idx} className="font-bold text-slate-900">
              {part.slice(1, -1)}
            </strong>
          );
        }
        if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
          return (
            <em key={idx} className="italic text-slate-800">
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith("~") && part.endsWith("~") && part.length > 2) {
          return (
            <del key={idx} className="line-through text-slate-500">
              {part.slice(1, -1)}
            </del>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </React.Fragment>
  );
}

async function compressImageFile(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
    throw new Error("Please select a PNG, JPEG, WebP, or GIF image.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image file must be smaller than 10 MB.");
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read selected image."));
    reader.readAsDataURL(file);
  });

  if (rawDataUrl.length <= 650_000 || file.type === "image/gif") {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export function CreateCampaignStudio({
  onCancel,
  onCreated,
}: {
  onCancel?: () => void;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const { user } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<ChannelValue>("WHATSAPP");
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  const [type, setType] = useState<CampaignTypeValue>("MARKETING");
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [mediaType, setMediaType] = useState<"NONE" | "IMAGE">("IMAGE");
  const [mediaUrl, setMediaUrl] = useState("");
  const [description, setDescription] = useState("");
  const [footerText, setFooterText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  const [actions, setActions] = useState<CampaignActionDraft[]>([
    { id: "action-1", type: "VISIT_WEBSITE", label: "", url: "" },
  ]);
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(
    null
  );

  const [launchOptionsOpen, setLaunchOptionsOpen] = useState(false);
  const [status, setStatus] = useState<CampaignStatusValue>("ACTIVE");
  const [budgetMajor, setBudgetMajor] = useState("0");

  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyMeta = getCurrencyMeta(user.currency);

  const previewTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(user.locale, {
        timeZone: user.timezone,
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date());
    } catch {
      return "10:24 AM";
    }
  }, [user.locale, user.timezone]);

  const applyDescriptionFormat = (
    prefix: string,
    suffix: string,
    fallbackText: string
  ) => {
    const el = textareaRef.current;
    if (!el) {
      setDescription((prev) => `${prev}${prefix}${fallbackText}${suffix}`);
      return;
    }
    const start = el.selectionStart ?? description.length;
    const end = el.selectionEnd ?? description.length;
    const selected = description.slice(start, end) || fallbackText;
    const next =
      description.slice(0, start) +
      prefix +
      selected +
      suffix +
      description.slice(end);
    setDescription(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorPos = start + prefix.length + selected.length + suffix.length;
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const applyBulletList = () => {
    const el = textareaRef.current;
    const insertBullet = (description.endsWith("\n") || description === "" ? "" : "\n") + "• ";
    if (!el) {
      setDescription((prev) => prev + insertBullet);
      return;
    }
    const start = el.selectionStart ?? description.length;
    const before = description.slice(0, start);
    const needsNewline = before.length > 0 && !before.endsWith("\n");
    const insertion = (needsNewline ? "\n" : "") + "• ";
    const next = before + insertion + description.slice(start);
    setDescription(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setDescription((prev) => `${prev}${emoji}`);
      setEmojiOpen(false);
      return;
    }
    const start = el.selectionStart ?? description.length;
    const end = el.selectionEnd ?? description.length;
    const next = description.slice(0, start) + emoji + description.slice(end);
    setDescription(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingMedia(true);
    try {
      const encoded = await compressImageFile(file);
      setMediaType("IMAGE");
      setMediaUrl(encoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load image.");
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const handleAddAction = () => {
    if (actions.length >= 3) return;
    setActions((prev) => [
      ...prev,
      {
        id: `action-${Date.now()}`,
        type: "VISIT_WEBSITE",
        label: "",
        url: "",
      },
    ]);
  };

  const handleUpdateAction = (
    id: string,
    patch: Partial<CampaignActionDraft>
  ) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
  };

  const handleRemoveAction = (id: string) => {
    setActions((prev) => {
      if (prev.length === 1) {
        return [{ id: prev[0].id, type: "VISIT_WEBSITE", label: "", url: "" }];
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/campaigns");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const budgetNum = Number(budgetMajor || "0");
      const budgetCents =
        Number.isFinite(budgetNum) && budgetNum >= 0
          ? toMinorUnits(budgetNum, user.currency)
          : 0;

      const cleanedActions = actions
        .filter((a) => a.label.trim().length > 0)
        .map((a) => ({
          type: a.type,
          label: a.label.trim(),
          ...(a.url.trim() ? { url: a.url.trim() } : {}),
        }));

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          channel,
          type,
          status,
          mediaType,
          mediaUrl: mediaType === "IMAGE" && mediaUrl ? mediaUrl : undefined,
          footerText: footerText.trim() || undefined,
          actions: cleanedActions.length > 0 ? cleanedActions : undefined,
          budgetCents,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create campaign.");
        return;
      }

      if (onCreated) {
        onCreated();
      } else {
        router.push("/campaigns");
        router.refresh();
      }
    } catch {
      setError("Network error while creating campaign.");
    } finally {
      setSaving(false);
    }
  };

  const visiblePreviewActions = actions.filter((a) => a.label.trim().length > 0);
  const formattedLines = description.trim()
    ? description.split("\n")
    : [];

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
      {/* Left Card: Campaign Builder Form */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-7 rounded-[24px] border border-violet-100/90 bg-white p-5 shadow-[0_12px_36px_-14px_rgba(109,40,217,0.12)] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[21px] font-extrabold tracking-tight text-[#140D33]">
            Create Campaign
          </h1>
          <button
            type="button"
            onClick={() => setLaunchOptionsOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/80 bg-[#FAF7FF] px-3 py-1 text-[11px] font-semibold text-[#6D28D9] transition hover:bg-[#F3EEFF]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{launchOptionsOpen ? "Hide Launch Options" : "Status & Budget"}</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700"
          >
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {/* Campaign name */}
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-12 sm:gap-4">
            <label
              htmlFor="campaign-name-input"
              className="sm:col-span-3 text-[13px] font-bold text-[#140D33]"
            >
              Campaign name
            </label>
            <div className="sm:col-span-9">
              <input
                id="campaign-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Festive Jewellery Offer"
                className="w-full rounded-xl border border-violet-200/85 bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs transition focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
              />
            </div>
          </div>

          {/* Channel */}
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-12 sm:gap-4">
            <span className="sm:col-span-3 text-[13px] font-bold text-[#140D33]">
              Channel
            </span>
            <div className="relative sm:col-span-9">
              <button
                type="button"
                aria-label="Select campaign channel"
                aria-expanded={channelMenuOpen}
                onClick={() => {
                  setChannelMenuOpen((v) => !v);
                  setTypeMenuOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-violet-200/85 bg-white px-3.5 py-2 text-[13.5px] font-semibold text-slate-800 shadow-2xs transition hover:border-violet-300"
              >
                <span className="flex items-center gap-2.5">
                  <ChannelBadge channel={channel} />
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform ${
                    channelMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {channelMenuOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-violet-100 bg-white p-1.5 shadow-xl">
                  {CAMPAIGN_CHANNELS.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        setChannel(ch);
                        setChannelMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                        ch === channel
                          ? "bg-violet-50 text-[#6D28D9]"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <ChannelBadge channel={ch} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Campaign type */}
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-12 sm:gap-4">
            <span className="sm:col-span-3 text-[13px] font-bold text-[#140D33]">
              Campaign type
            </span>
            <div className="relative sm:col-span-9">
              <button
                type="button"
                aria-label="Select campaign type"
                aria-expanded={typeMenuOpen}
                onClick={() => {
                  setTypeMenuOpen((v) => !v);
                  setChannelMenuOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-violet-200/85 bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-slate-800 shadow-2xs transition hover:border-violet-300"
              >
                <span>{TYPE_LABELS[type]}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform ${
                    typeMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {typeMenuOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-2xl border border-violet-100 bg-white p-1.5 shadow-xl">
                  {CAMPAIGN_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setType(t);
                        setTypeMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                        t === type
                          ? "bg-violet-50 text-[#6D28D9]"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{TYPE_LABELS[t]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Media */}
          <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-12 sm:gap-4">
            <span className="pt-1 sm:col-span-3 text-[13px] font-bold text-[#140D33]">
              Media
            </span>
            <div className="sm:col-span-9 space-y-3">
              <div className="flex items-center gap-6 pt-0.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={mediaType === "NONE"}
                  onClick={() => setMediaType("NONE")}
                  className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-800"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                      mediaType === "NONE"
                        ? "border-[#6D28D9] bg-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {mediaType === "NONE" && (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#6D28D9]" />
                    )}
                  </span>
                  <span>No media</span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={mediaType === "IMAGE"}
                  onClick={() => setMediaType("IMAGE")}
                  className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-800"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                      mediaType === "IMAGE"
                        ? "border-[#6D28D9] bg-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {mediaType === "IMAGE" && (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#6D28D9]" />
                    )}
                  </span>
                  <span>Image</span>
                </button>
              </div>

              {mediaType === "IMAGE" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFilePick}
                      className="hidden"
                      aria-label="Upload campaign image"
                    />
                    <button
                      type="button"
                      disabled={uploadingMedia}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-[74px] w-[136px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-violet-300 bg-[#FAF7FF] text-xs font-bold text-[#6D28D9] transition hover:border-violet-500 hover:bg-[#F3EEFF] disabled:opacity-60"
                    >
                      <UploadCloud className="h-5 w-5 text-[#7C3AED]" />
                      <span>{uploadingMedia ? "Loading..." : "Add image"}</span>
                    </button>

                    {mediaUrl && (
                      <div className="relative h-[74px] w-[136px] overflow-hidden rounded-2xl border border-violet-200 bg-slate-100 shadow-xs">
                        <img
                          src={mediaUrl}
                          alt="Selected campaign graphic"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label="Remove campaign image"
                          onClick={() => setMediaUrl("")}
                          className="absolute top-1.5 right-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick studio artwork gallery */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Studio graphics:
                    </span>
                    {STUDIO_MEDIA_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setMediaUrl(preset.src)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                          mediaUrl === preset.src
                            ? "border-[#7C3AED] bg-[#F3EEFF] text-[#6D28D9]"
                            : "border-violet-100 bg-white text-slate-600 hover:border-violet-300"
                        }`}
                      >
                        <img
                          src={preset.src}
                          alt=""
                          aria-hidden="true"
                          className="h-4 w-5 rounded object-cover"
                        />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description with Interactive Formatting Toolbar */}
          <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-12 sm:gap-4">
            <label
              htmlFor="campaign-description-input"
              className="pt-2 sm:col-span-3 text-[13px] font-bold text-[#140D33]"
            >
              Description
            </label>
            <div className="sm:col-span-9 rounded-2xl border border-violet-200/85 bg-white shadow-2xs transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10">
              <div className="relative flex items-center gap-1 border-b border-violet-100 bg-[#FAF7FF] px-3 py-1.5 rounded-t-2xl">
                <button
                  type="button"
                  title="Bold (*text*)"
                  aria-label="Format bold"
                  onClick={() => applyDescriptionFormat("*", "*", "Headline")}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-[#EAE0FF] text-[#5B21B6] transition hover:bg-[#DDD0FE]"
                >
                  <Bold className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  title="Italic (_text_)"
                  aria-label="Format italic"
                  onClick={() => applyDescriptionFormat("_", "_", "italic")}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition hover:bg-violet-100/70"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Strikethrough (~text~)"
                  aria-label="Format strikethrough"
                  onClick={() => applyDescriptionFormat("~", "~", "old text")}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition hover:bg-violet-100/70"
                >
                  <Strikethrough className="h-3.5 w-3.5" />
                </button>
                <span className="mx-1 h-4 w-px bg-violet-200/80" />
                <button
                  type="button"
                  title="Bullet item"
                  aria-label="Insert bullet list item"
                  onClick={applyBulletList}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition hover:bg-violet-100/70"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <span className="mx-1 h-4 w-px bg-violet-200/80" />
                <button
                  type="button"
                  title="Insert emoji"
                  aria-label="Open emoji picker"
                  onClick={() => setEmojiOpen((v) => !v)}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition hover:bg-violet-100/70"
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>

                {emojiOpen && (
                  <div className="absolute left-36 top-9 z-30 grid grid-cols-6 gap-1 rounded-2xl border border-violet-100 bg-white p-2 shadow-xl">
                    {EMOJI_PALETTE.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => insertEmoji(em)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-base hover:bg-violet-50"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                ref={textareaRef}
                id="campaign-description-input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={"*The Festive Edit ✨*\nExplore our latest collection and limited-time offer."}
                className="min-h-[68px] w-full resize-y rounded-b-2xl bg-transparent px-3.5 py-2 text-[13.5px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer text */}
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-12 sm:gap-4">
            <label
              htmlFor="campaign-footer-input"
              className="sm:col-span-3 text-[13px] font-bold text-[#140D33]"
            >
              Footer text
            </label>
            <div className="sm:col-span-9">
              <input
                id="campaign-footer-input"
                type="text"
                maxLength={120}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="e.g., Cielora Jewellery"
                className="w-full rounded-xl border border-violet-200/85 bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs transition focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
              />
            </div>
          </div>

          {/* Interactive Actions */}
          <div className="pt-1">
            <p className="text-[13px] font-bold text-[#140D33]">
              Interactive Actions
            </p>
            <div className="mt-2.5 space-y-2.5">
              {actions.map((action) => {
                const actionMeta =
                  ACTION_TYPE_OPTIONS.find((opt) => opt.value === action.type) ??
                  ACTION_TYPE_OPTIONS[0];
                return (
                  <div
                    key={action.id}
                    className="rounded-2xl border border-violet-100 bg-[#FCF9FF] p-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Action Type Dropdown */}
                      <div className="relative min-w-[162px] flex-1 sm:flex-none">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionDropdownId((prev) =>
                              prev === action.id ? null : action.id
                            )
                          }
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-violet-200/85 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs"
                        >
                          <span className="flex items-center gap-2">
                            {action.type === "VISIT_WEBSITE" && (
                              <Globe className="h-4 w-4 text-[#7C3AED]" />
                            )}
                            {action.type === "CALL_PHONE" && (
                              <Phone className="h-4 w-4 text-[#7C3AED]" />
                            )}
                            {action.type === "QUICK_REPLY" && (
                              <CornerDownLeft className="h-4 w-4 text-[#7C3AED]" />
                            )}
                            <span>{actionMeta.label}</span>
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                        </button>

                        {openActionDropdownId === action.id && (
                          <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-violet-100 bg-white p-1 shadow-xl">
                            {ACTION_TYPE_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  handleUpdateAction(action.id, {
                                    type: opt.value,
                                  });
                                  setOpenActionDropdownId(null);
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${
                                  opt.value === action.type
                                    ? "bg-violet-50 text-[#6D28D9]"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {opt.value === "VISIT_WEBSITE" && (
                                  <Globe className="h-3.5 w-3.5 text-[#7C3AED]" />
                                )}
                                {opt.value === "CALL_PHONE" && (
                                  <Phone className="h-3.5 w-3.5 text-[#7C3AED]" />
                                )}
                                {opt.value === "QUICK_REPLY" && (
                                  <CornerDownLeft className="h-3.5 w-3.5 text-[#7C3AED]" />
                                )}
                                <span>{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <span className="text-[11.5px] font-medium text-slate-500">
                        Button text
                      </span>

                      <input
                        type="text"
                        maxLength={40}
                        value={action.label}
                        onChange={(e) =>
                          handleUpdateAction(action.id, { label: e.target.value })
                        }
                        placeholder={actionMeta.placeholder}
                        className="min-w-[140px] flex-1 rounded-xl border border-violet-200/85 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                      />

                      <button
                        type="button"
                        aria-label="Remove action"
                        onClick={() => handleRemoveAction(action.id)}
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-violet-200/85 bg-white text-[#7C3AED] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {action.type !== "QUICK_REPLY" && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={action.url}
                          onChange={(e) =>
                            handleUpdateAction(action.id, { url: e.target.value })
                          }
                          placeholder={actionMeta.targetPlaceholder}
                          className="w-full rounded-xl border border-violet-100 bg-white px-3 py-1.5 text-[11.5px] text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {actions.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddAction}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#F3EEFF] px-3.5 py-2 text-xs font-bold text-[#6D28D9] transition hover:bg-[#EAE0FF]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span>Add action</span>
                </button>
              )}
            </div>
          </div>

          {/* Optional Status & Budget Drawer */}
          {launchOptionsOpen && (
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-violet-100 bg-[#FAF7FF] p-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-700">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as CampaignStatusValue)
                  }
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-violet-500 focus:outline-none"
                >
                  {CAMPAIGN_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-700">
                  Budget ({currencyMeta.code} {currencyMeta.symbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step={currencyMeta.decimals === 0 ? "1" : "0.01"}
                  value={budgetMajor}
                  onChange={(e) => setBudgetMajor(e.target.value)}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="cursor-pointer rounded-xl bg-[#EFEAFE] px-6 py-2.5 text-xs font-bold text-[#140D33] transition hover:bg-[#E4DCFD]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cielora-ai-btn cursor-pointer rounded-xl px-7 py-2.5 text-xs font-bold text-white transition disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </div>
      </form>

      {/* Right Card: Live Campaign Preview inside Realistic Smartphone Mockup */}
      <div className="lg:col-span-5 rounded-[24px] border border-violet-200/75 bg-gradient-to-b from-[#FAF7FF] via-[#F4ECFF] to-[#EDE2FF] p-5 shadow-[0_12px_36px_-14px_rgba(124,58,237,0.16)] sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-extrabold tracking-tight text-[#140D33]">
            Campaign preview
          </h2>
          <span className="rounded-full bg-white/85 px-2.5 py-1 text-[10.5px] font-bold text-[#6D28D9] ring-1 ring-violet-200/80">
            {CHANNEL_LABELS[channel]}
          </span>
        </div>

        {/* Flagship Phone Frame */}
        <div className="mx-auto mt-4 w-full max-w-[300px] select-none">
          <div className="relative rounded-[42px] bg-gradient-to-b from-[#332E42] via-[#171321] to-[#2B2538] p-[9px] shadow-[0_24px_48px_-14px_rgba(24,10,55,0.45)] ring-1 ring-white/25">
            {/* Subtle side hardware keys */}
            <span
              aria-hidden="true"
              className="absolute -left-[2.5px] top-24 h-8 w-[3px] rounded-l bg-[#443D56]"
            />
            <span
              aria-hidden="true"
              className="absolute -left-[2.5px] top-36 h-8 w-[3px] rounded-l bg-[#443D56]"
            />
            <span
              aria-hidden="true"
              className="absolute -right-[2.5px] top-28 h-12 w-[3px] rounded-r bg-[#443D56]"
            />

            <div className="relative flex min-h-[488px] flex-col overflow-hidden rounded-[34px] bg-[#EFEAE2]">
              {/* iOS Status Bar & Dynamic Island */}
              <div className="flex items-center justify-between bg-[#F7F8FA] px-5 pt-2.5 pb-1 text-[11px] font-bold text-slate-900">
                <span className="tabular-nums">10:24</span>
                <div className="flex h-[20px] w-[78px] items-center justify-end rounded-full bg-[#09090B] px-2">
                  <span className="h-2 w-2 rounded-full bg-[#1E1B4B] ring-1 ring-indigo-900/60" />
                </div>
                <div className="flex items-center gap-1 text-slate-900">
                  <svg className="h-2.5 w-3.5" viewBox="0 0 16 11" fill="currentColor" aria-hidden="true">
                    <rect x="0" y="7" width="2.5" height="4" rx="0.6" />
                    <rect x="4" y="5" width="2.5" height="6" rx="0.6" />
                    <rect x="8" y="3" width="2.5" height="8" rx="0.6" />
                    <rect x="12" y="0.5" width="2.5" height="10.5" rx="0.6" />
                  </svg>
                  <svg className="h-2.5 w-4" viewBox="0 0 22 11" fill="none" aria-hidden="true">
                    <rect x="0.7" y="0.8" width="18" height="9.4" rx="2.4" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="2.2" y="2.3" width="15" height="6.4" rx="1.2" fill="currentColor" />
                    <path d="M20.2 3.8v3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Channel Preview Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 bg-[#F7F8FA] px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ArrowLeft className="h-4 w-4 shrink-0 text-slate-700" />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white p-1 ring-1 ring-violet-200 shadow-2xs">
                    <img
                      src="/images/cielora-mark.png"
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[12px] font-bold text-slate-900">
                        {user.workspaceName || "Cielora AI"}
                      </span>
                      {/* Verified Business Green Badge */}
                      <svg
                        className="h-3.5 w-3.5 shrink-0 text-[#22C55E]"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-label="Verified Business"
                      >
                        <path d="M10 1.5l2.2 1.3 2.5-.2 1.1 2.3 2.2 1.3-.3 2.5 1.3 2.2-1.3 2.2.3 2.5-2.2 1.3-1.1 2.3-2.5-.2L10 18.5l-2.2-1.3-2.5.2-1.1-2.3-2.2-1.3.3-2.5L1 10l1.3-2.2-.3-2.5 2.2-1.3 1.1-2.3 2.5.2L10 1.5z" />
                        <path
                          d="M6.8 10.2l2.1 2.1 4.4-4.5"
                          stroke="#fff"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>
                    <div className="text-[9.5px] font-medium text-slate-500">
                      {channel === "WHATSAPP"
                        ? "Business Account"
                        : `${CHANNEL_LABELS[channel]} • ${TYPE_LABELS[type]}`}
                    </div>
                  </div>
                </div>

                {channel === "WHATSAPP" ? (
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <Video className="h-3.5 w-3.5" />
                    <Phone className="h-3.5 w-3.5" />
                    <MoreVertical className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Share2 className="h-3.5 w-3.5" />
                    <MoreVertical className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              {/* Chat Wallpaper & Message Card */}
              <div
                className="flex-1 overflow-y-auto p-3"
                style={{
                  backgroundImage:
                    channel === "WHATSAPP"
                      ? "url('/images/whatsapp-wallpaper.svg')"
                      : undefined,
                  backgroundRepeat: "repeat",
                  backgroundSize: "150px 150px",
                  backgroundColor: channel === "WHATSAPP" ? "#EFEAE2" : "#F6F3FF",
                }}
              >
                <div className="rounded-2xl rounded-tl-md bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.12)]">
                  {mediaType === "IMAGE" && (
                    <div className="overflow-hidden rounded-xl">
                      {mediaUrl ? (
                        <img
                          src={mediaUrl}
                          alt={name || "Campaign visual"}
                          className="h-[146px] w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-[130px] w-full flex-col items-center justify-center gap-1.5 border border-dashed border-violet-200 bg-gradient-to-br from-violet-50 via-[#FAF7FF] to-purple-50 px-4 text-center">
                          <ImageIcon className="h-6 w-6 text-violet-400" />
                          <span className="text-[11px] font-medium text-violet-600">
                            Add or choose a studio image to preview
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="px-1.5 pt-2.5 pb-1">
                    {formattedLines.length > 0 ? (
                      <div className="space-y-0.5 text-[12px] leading-[1.42] text-slate-800 break-words">
                        {formattedLines.map((line, i) => (
                          <div key={i} className="min-h-[1em]">
                            {renderFormattedLine(line, i)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {name.trim() ? (
                          <p className="text-[12.5px] font-bold text-slate-900">
                            {name}
                          </p>
                        ) : (
                          <p className="text-[12px] font-medium text-slate-400">
                            Write your headline &amp; campaign message on the left
                            to preview it here...
                          </p>
                        )}
                      </div>
                    )}

                    {footerText.trim() && (
                      <p className="mt-1.5 text-[10.5px] italic text-slate-400">
                        {footerText}
                      </p>
                    )}

                    <div className="mt-1 text-right text-[9.5px] font-medium text-slate-400">
                      {previewTime}
                    </div>
                  </div>

                  {visiblePreviewActions.length > 0 && (
                    <div className="mt-1 border-t border-slate-100 divide-y divide-slate-100">
                      {visiblePreviewActions.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center justify-center gap-1.5 py-2 text-[11.5px] font-semibold text-[#2563EB]"
                        >
                          {act.type === "VISIT_WEBSITE" && (
                            <ExternalLink className="h-3.5 w-3.5" />
                          )}
                          {act.type === "CALL_PHONE" && (
                            <Phone className="h-3.5 w-3.5" />
                          )}
                          {act.type === "QUICK_REPLY" && (
                            <MessageCircle className="h-3.5 w-3.5" />
                          )}
                          <span>{act.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Composer + iOS Home Bar */}
              <div className="bg-[#EFEAE2]/95 px-2.5 pt-1.5 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-1 items-center justify-between rounded-full bg-white px-3 py-1.5 text-slate-400 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Smile className="h-4 w-4 text-slate-500" />
                      <span className="text-[11.5px]">Message</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Paperclip className="h-3.5 w-3.5 -rotate-45" />
                      <Camera className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white shadow-xs">
                    {channel === "WHATSAPP" ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <div className="mx-auto mt-2.5 h-1 w-24 rounded-full bg-slate-900/75" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
