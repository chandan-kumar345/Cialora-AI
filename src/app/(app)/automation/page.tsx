"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Flag,
  GitFork,
  Heart,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Rocket,
  Rss,
  Save,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  FacebookBrandBadge,
  InstagramBrandBadge,
} from "@/components/SocialBrandIcons";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { formatDate, formatNumber } from "@/lib/format";

interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  actionChannel: string;
  actionTemplate: string;
  isActive: boolean;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
}

interface SocialPostItem {
  id: string;
  platform: string;
  title: string;
  content: string;
  mediaUrl: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  reachCount: number;
  createdAt: string;
}

interface IntegrationBrief {
  provider: string;
  status: string;
  displayName: string;
}

type PipelineTab =
  | "pipeline"
  | "workflows"
  | "scheduled"
  | "library"
  | "analytics"
  | "settings";

const TRIGGER_OPTIONS = [
  {
    id: "SCHEDULE_POST",
    title: "Schedule Post",
    blockLabel: "Schedule (Date & Time)",
    subtitle: "Run on specific date & time",
    icon: Calendar,
  },
  {
    id: "NEW_CONTENT_ADDED",
    title: "New Content Added",
    blockLabel: "New Content Added",
    subtitle: "Run when media is uploaded",
    icon: Rss,
  },
  {
    id: "RECURRING_SCHEDULE",
    title: "Recurring Schedule",
    blockLabel: "Recurring (Daily / Weekly)",
    subtitle: "Auto-repeat weekly cadence",
    icon: Clock,
  },
  {
    id: "LEAD_CREATED",
    title: "New Lead Created",
    blockLabel: "New Lead in CRM",
    subtitle: "Trigger when lead enters CRM",
    icon: Users,
  },
] as const;

const CONTENT_ACTION_OPTIONS = [
  {
    id: "ai-post",
    blockLabel: "Create Post (AI)",
    title: "Create Post",
    subtitle: "Use AI or template to prepare content",
  },
  {
    id: "content-library",
    blockLabel: "Use from Content Library",
    title: "Select Library Asset",
    subtitle: "Pull approved post from library",
  },
  {
    id: "ab-variant",
    blockLabel: "A/B Post (Variant)",
    title: "Create A/B Variant",
    subtitle: "Generate two caption variations",
  },
] as const;

const CONDITION_OPTIONS = [
  { id: "none", label: "No branch filter" },
  { id: "post-type", label: "If / Else (e.g. Post Type)" },
  { id: "platform", label: "Platform (Instagram / Facebook)" },
  { id: "time-day", label: "Time / Day (e.g. Weekend)" },
] as const;

const SCHEDULE_PRESETS = [
  "Every Friday, 11:00 AM",
  "Daily, 09:00 AM",
  "Every Monday, 10:00 AM",
  "Weekends, 06:00 PM",
  "On Content Upload",
];

const POST_TYPES = [
  "Promotional",
  "Product Launch",
  "Educational",
  "Announcement",
];

export default function AutomationPage() {
  const { user } = useWorkspace();

  const [activeTab, setActiveTab] = useState<PipelineTab>("pipeline");
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationBrief[]>([]);
  const [loading, setLoading] = useState(true);

  // Visual Pipeline & Details state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowActive, setWorkflowActive] = useState(true);
  const [triggerType, setTriggerType] = useState<string>("SCHEDULE_POST");
  const [contentAction, setContentAction] = useState<string>("ai-post");
  const [useInstagram, setUseInstagram] = useState(true);
  const [useFacebook, setUseFacebook] = useState(true);
  const [scheduleSlot, setScheduleSlot] = useState(SCHEDULE_PRESETS[0]);
  const [postType, setPostType] = useState(POST_TYPES[0]);
  const [conditionRule, setConditionRule] = useState<string>("none");

  // Palette accordion state
  const [triggersOpen, setTriggersOpen] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(true);
  const [conditionsOpen, setConditionsOpen] = useState(true);

  // Feedback & quick schedule modal
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [postMenuId, setPostMenuId] = useState<string | null>(null);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostPlatform, setNewPostPlatform] = useState<"INSTAGRAM" | "FACEBOOK">(
    "INSTAGRAM"
  );
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostDate, setNewPostDate] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);

  // CRM Rule Modal for non-social automation triggers
  const [crmRuleOpen, setCrmRuleOpen] = useState(false);
  const [crmName, setCrmName] = useState("");
  const [crmTrigger, setCrmTrigger] = useState("LEAD_CREATED");
  const [crmChannel, setCrmChannel] = useState("WHATSAPP");
  const [crmTemplate, setCrmTemplate] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [wfRes, socialRes, intRes] = await Promise.all([
        fetch("/api/automation", { cache: "no-store" }),
        fetch("/api/social", { cache: "no-store" }),
        fetch("/api/integrations", { cache: "no-store" }),
      ]);
      if (wfRes.ok) {
        const d = await wfRes.json();
        setWorkflows(d.workflows ?? []);
      }
      if (socialRes.ok) {
        const s = await socialRes.json();
        setPosts(s.posts ?? []);
      }
      if (intRes.ok) {
        const i = await intRes.json();
        setIntegrations(i.integrations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const showNotice = (type: "ok" | "err", text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const resolveChannelEnum = () => {
    if (useInstagram && useFacebook) return "INSTAGRAM_AND_FACEBOOK";
    if (useInstagram) return "INSTAGRAM";
    if (useFacebook) return "FACEBOOK";
    return "INSTAGRAM_AND_FACEBOOK";
  };

  const persistWorkflow = async (activateOverride?: boolean) => {
    const cleanName = workflowName.trim() || `${postType} Social Pipeline`;
    if (!useInstagram && !useFacebook) {
      showNotice("err", "Select at least Instagram or Facebook to publish.");
      return null;
    }
    setSaving(true);
    try {
      const nextActive =
        activateOverride !== undefined ? activateOverride : workflowActive;
      const payload = {
        name: cleanName,
        description: `${scheduleSlot} • ${postType}`,
        triggerType,
        actionChannel: resolveChannelEnum(),
        actionTemplate: `[${postType}] ${
          CONTENT_ACTION_OPTIONS.find((a) => a.id === contentAction)?.title ??
          "Create Post"
        } — Schedule: ${scheduleSlot}${
          conditionRule !== "none"
            ? ` (Filter: ${
                CONDITION_OPTIONS.find((c) => c.id === conditionRule)?.label ?? ""
              })`
            : ""
        }`,
        isActive: nextActive,
      };

      const res = await fetch(
        editingId ? `/api/automation/${editingId}` : "/api/automation",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showNotice("err", data.error ?? "Unable to save automation pipeline.");
        return null;
      }
      const saved: WorkflowItem = data.workflow;
      setEditingId(saved.id);
      setWorkflowName(saved.name);
      setWorkflowActive(saved.isActive);
      await loadAll();
      return saved;
    } catch {
      showNotice("err", "Network error saving workflow.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSavePipeline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const saved = await persistWorkflow();
    if (saved) {
      showNotice("ok", `Pipeline "${saved.name}" saved to your workspace.`);
    }
  };

  const handlePublishPipeline = async () => {
    const saved = await persistWorkflow(true);
    if (saved) {
      showNotice("ok", `Pipeline "${saved.name}" is now live and active.`);
    }
  };

  const handleTestRun = async () => {
    setTesting(true);
    try {
      let targetId = editingId;
      if (!targetId) {
        const created = await persistWorkflow(true);
        if (!created) return;
        targetId = created.id;
      } else if (!workflowActive) {
        const updated = await persistWorkflow(true);
        if (!updated) return;
      }
      const res = await fetch(`/api/automation/${targetId}/trigger`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice("err", data.error ?? "Test run failed.");
        return;
      }
      await loadAll();
      showNotice("ok", "Test run executed and logged in workspace telemetry.");
    } finally {
      setTesting(false);
    }
  };

  const loadWorkflowIntoBuilder = (wf: WorkflowItem) => {
    setEditingId(wf.id);
    setWorkflowName(wf.name);
    setWorkflowActive(wf.isActive);
    setTriggerType(
      TRIGGER_OPTIONS.some((t) => t.id === wf.triggerType)
        ? wf.triggerType
        : "SCHEDULE_POST"
    );
    if (wf.actionChannel === "INSTAGRAM") {
      setUseInstagram(true);
      setUseFacebook(false);
    } else if (wf.actionChannel === "FACEBOOK") {
      setUseInstagram(false);
      setUseFacebook(true);
    } else {
      setUseInstagram(true);
      setUseFacebook(true);
    }
    setActiveTab("pipeline");
  };

  const toggleWorkflowRow = async (wf: WorkflowItem) => {
    await fetch(`/api/automation/${wf.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !wf.isActive }),
    });
    if (editingId === wf.id) setWorkflowActive(!wf.isActive);
    loadAll();
  };

  const runTriggerRow = async (id: string) => {
    const res = await fetch(`/api/automation/${id}/trigger`, { method: "POST" });
    if (res.ok) {
      showNotice("ok", "Workflow executed successfully.");
      loadAll();
    }
  };

  const deleteWorkflowRow = async (id: string) => {
    const res = await fetch(`/api/automation/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingId === id) {
        setEditingId(null);
        setWorkflowName("");
      }
      loadAll();
    }
  };

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPost(true);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: newPostPlatform,
          title: newPostTitle,
          content: newPostContent,
          status: "SCHEDULED",
          scheduledAt: newPostDate ? new Date(newPostDate).toISOString() : null,
        }),
      });
      if (res.ok) {
        setNewPostTitle("");
        setNewPostContent("");
        setNewPostDate("");
        setScheduleModalOpen(false);
        showNotice("ok", "Post scheduled and added to your upcoming queue.");
        loadAll();
      }
    } finally {
      setCreatingPost(false);
    }
  };

  const handlePublishPostNow = async (postId: string) => {
    setPostMenuId(null);
    await fetch(`/api/social/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    loadAll();
  };

  const handleDeletePost = async (postId: string) => {
    setPostMenuId(null);
    await fetch(`/api/social/${postId}`, { method: "DELETE" });
    loadAll();
  };

  const handleCreateCrmRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: crmName,
          triggerType: crmTrigger,
          actionChannel: crmChannel,
          actionTemplate: crmTemplate,
          isActive: true,
        }),
      });
      if (res.ok) {
        setCrmName("");
        setCrmTemplate("");
        setCrmRuleOpen(false);
        showNotice("ok", "Automation rule activated.");
        loadAll();
      }
    } finally {
      setSaving(false);
    }
  };

  // Real derived KPI totals (zero dummy values)
  const scheduledPosts = useMemo(
    () => posts.filter((p) => p.status === "SCHEDULED"),
    [posts]
  );
  const publishedPosts = useMemo(
    () => posts.filter((p) => p.status === "PUBLISHED"),
    [posts]
  );
  const activeWorkflows = useMemo(
    () => workflows.filter((w) => w.isActive),
    [workflows]
  );
  const totalReach = useMemo(
    () => posts.reduce((acc, p) => acc + p.reachCount, 0),
    [posts]
  );
  const totalEngagement = useMemo(
    () =>
      posts.reduce(
        (acc, p) => acc + p.likesCount + p.commentsCount + p.sharesCount,
        0
      ),
    [posts]
  );
  const totalExecutions = useMemo(
    () => workflows.reduce((acc, w) => acc + w.executionCount, 0),
    [workflows]
  );

  const igConnected = integrations.some(
    (i) => i.provider === "INSTAGRAM" && i.status === "CONNECTED"
  );
  const fbConnected = integrations.some(
    (i) => i.provider === "FACEBOOK" && i.status === "CONNECTED"
  );

  const activeTriggerMeta =
    TRIGGER_OPTIONS.find((t) => t.id === triggerType) ?? TRIGGER_OPTIONS[0];
  const TriggerIcon = activeTriggerMeta.icon;
  const activeContentMeta =
    CONTENT_ACTION_OPTIONS.find((a) => a.id === contentAction) ??
    CONTENT_ACTION_OPTIONS[0];

  const kpis = [
    {
      label: "Scheduled Posts",
      value: formatNumber(scheduledPosts.length, user.locale),
      badge: scheduledPosts.length > 0 ? "Queued" : null,
      badgeCls: "text-emerald-600",
      cardCls: "bg-[#F5F2FF] border-[#E6DEFF]",
      iconCls: "bg-[#EAE2FF] text-[#7C3AED]",
      icon: Calendar,
    },
    {
      label: "Published",
      value: formatNumber(publishedPosts.length, user.locale),
      badge: publishedPosts.length > 0 ? "Live" : null,
      badgeCls: "text-emerald-600",
      cardCls: "bg-[#ECFCF3] border-[#CFF7E0]",
      iconCls: "bg-[#D1FADF] text-[#16A34A]",
      icon: Send,
    },
    {
      label: "In Queue",
      value: formatNumber(activeWorkflows.length, user.locale),
      badge: null,
      badgeCls: "text-amber-600",
      cardCls: "bg-[#FFF5EC] border-[#FEE2C8]",
      iconCls: "bg-[#FDE8D4] text-[#EA580C]",
      icon: Clock,
    },
    {
      label: "Total Reach",
      value: formatNumber(totalReach, user.locale),
      badge: totalExecutions > 0 ? `${totalExecutions} runs` : null,
      badgeCls: "text-emerald-600",
      cardCls: "bg-[#EFF6FF] border-[#DBEAFE]",
      iconCls: "bg-[#DBEAFE] text-[#2563EB]",
      icon: Users,
    },
    {
      label: "Engagement",
      value: formatNumber(totalEngagement, user.locale),
      badge: null,
      badgeCls: "text-emerald-600",
      cardCls: "bg-[#FFF0F6] border-[#FCE7F3]",
      iconCls: "bg-[#FCE7F3] text-[#DB2777]",
      icon: Heart,
    },
  ];

  const tabs: Array<{
    key: PipelineTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { key: "pipeline", label: "Automation Pipeline", icon: GitFork },
    { key: "workflows", label: "Workflows", icon: Layers, count: workflows.length },
    {
      key: "scheduled",
      label: "Scheduled Posts",
      icon: Calendar,
      count: scheduledPosts.length,
    },
    { key: "library", label: "Content Library", icon: ImageIcon },
    { key: "analytics", label: "Analytics", icon: BarChart2 },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Top 5 KPI Cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.02)] ${kpi.cardCls}`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${kpi.iconCls}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[11px] font-medium text-slate-600">
                  {kpi.label}
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-[20px] font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
                    {kpi.value}
                  </span>
                  {kpi.badge && (
                    <span className={`text-[10.5px] font-bold ${kpi.badgeCls}`}>
                      {kpi.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 2. Pill Navigation Strip */}
      <nav
        aria-label="Automation workspace tabs"
        className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-full border border-violet-100/90 bg-white p-1.5 shadow-[0_4px_20px_rgba(91,33,182,0.04)]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition whitespace-nowrap ${
                isActive
                  ? "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-[0_6px_16px_-4px_rgba(109,40,217,0.45)]"
                  : "text-slate-600 hover:bg-violet-50/70 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Inline Toast Feedback */}
      {notice && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 text-xs font-semibold ${
            notice.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded-lg p-1 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 3. Main Content Area */}
      {activeTab === "pipeline" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 items-start">
          {/* Left + Center (9 cols) */}
          <div className="xl:col-span-9 space-y-4">
            {/* Visual Automation Pipeline Builder Card */}
            <div className="rounded-[24px] border border-violet-100/90 bg-white p-5 shadow-[0_8px_28px_rgba(91,33,182,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-1.5">
                    <InstagramBrandBadge size="md" className="ring-2 ring-white" />
                    <FacebookBrandBadge size="md" className="ring-2 ring-white" />
                  </div>
                  <div>
                    <h1 className="text-[17px] font-extrabold tracking-tight text-slate-900">
                      Social Post Automation Pipeline
                    </h1>
                    <p className="text-[11.5px] text-slate-500">
                      Build a visual workflow to create, schedule and auto-publish
                      posts on Instagram &amp; Facebook.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={workflowActive}
                    onClick={() => setWorkflowActive((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <span
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        workflowActive ? "bg-[#16A34A]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
                          workflowActive ? "translate-x-4.5" : "translate-x-1"
                        }`}
                      />
                    </span>
                    <span>{workflowActive ? "Workflow Active" : "Paused"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSavePipeline()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? "Saving..." : "Save"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={testing || saving}
                    onClick={handleTestRun}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{testing ? "Running..." : "Test Run"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handlePublishPipeline}
                    className="cielora-ai-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    <span>Publish</span>
                  </button>
                </div>
              </div>

              {/* Interactive Visual Node Canvas */}
              <div
                className="mt-4 overflow-x-auto rounded-2xl border border-violet-100/90 bg-[#FCF9FF] px-4 py-6"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(124, 58, 237, 0.14) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              >
                <div className="mx-auto flex min-w-[720px] items-center justify-center gap-0">
                  {/* Node 1: Trigger */}
                  <div className="relative w-[148px] shrink-0 rounded-2xl border border-violet-300/80 bg-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.3)]">
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-white ring-2 ring-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <div className="flex items-center gap-1.5 rounded-t-[15px] bg-gradient-to-r from-[#7C3AED] to-[#9333EA] px-3 py-1.5 text-[11px] font-bold text-white">
                      <Zap className="h-3.5 w-3.5" />
                      <span>Trigger</span>
                    </div>
                    <div className="flex items-start gap-2 px-3 py-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                        <TriggerIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-bold text-slate-900 leading-tight">
                          {activeTriggerMeta.title}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-500 leading-snug">
                          {activeTriggerMeta.subtitle}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connector 1 -> 2 */}
                  <svg width="34" height="24" viewBox="0 0 34 24" className="shrink-0">
                    <circle cx="3" cy="12" r="3" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="2" />
                    <path d="M6 12 H27" stroke="#8B5CF6" strokeWidth="2" />
                    <path d="M23 8 L29 12 L23 16" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  {/* Node 2: Create Post Action */}
                  <div className="relative w-[156px] shrink-0 rounded-2xl border border-sky-200 bg-white shadow-[0_8px_20px_-8px_rgba(2,132,199,0.22)]">
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-white ring-2 ring-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <div className="flex items-center gap-1.5 rounded-t-[15px] bg-gradient-to-r from-[#E0F2FE] to-[#BAE6FD] px-3 py-1.5 text-[11px] font-bold text-sky-900">
                      <Calendar className="h-3.5 w-3.5 text-sky-600" />
                      <span>Action</span>
                    </div>
                    <div className="flex items-start gap-2 px-3 py-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <Pencil className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-bold text-slate-900 leading-tight">
                          {activeContentMeta.title}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-500 leading-snug">
                          {activeContentMeta.subtitle}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fork Connector */}
                  <svg width="46" height="118" viewBox="0 0 46 118" className="shrink-0">
                    <circle cx="3" cy="59" r="3" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="2" />
                    <path
                      d="M6 59 C22 59, 20 26, 41 26"
                      fill="none"
                      stroke={useInstagram ? "#8B5CF6" : "#CBD5E1"}
                      strokeWidth="2"
                      strokeDasharray={useInstagram ? undefined : "4 3"}
                    />
                    <path
                      d="M36 22 L42 26 L36 30"
                      fill="none"
                      stroke={useInstagram ? "#8B5CF6" : "#CBD5E1"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 59 C22 59, 20 92, 41 92"
                      fill="none"
                      stroke={useFacebook ? "#8B5CF6" : "#CBD5E1"}
                      strokeWidth="2"
                      strokeDasharray={useFacebook ? undefined : "4 3"}
                    />
                    <path
                      d="M36 88 L42 92 L36 96"
                      fill="none"
                      stroke={useFacebook ? "#8B5CF6" : "#CBD5E1"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  {/* Branch Column: Publish on Instagram + Publish on Facebook */}
                  <div className="flex flex-col gap-3 shrink-0">
                    {/* Instagram Branch */}
                    <button
                      type="button"
                      onClick={() => setUseInstagram((v) => !v)}
                      className={`relative w-[154px] text-left rounded-2xl border bg-white transition ${
                        useInstagram
                          ? "border-pink-200 shadow-[0_8px_18px_-8px_rgba(236,72,153,0.28)]"
                          : "border-slate-200 opacity-50"
                      }`}
                    >
                      {useInstagram && (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-white ring-2 ring-white">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 rounded-t-[15px] bg-gradient-to-r from-[#FCE7F3] to-[#FBCFE8] px-3 py-1 text-[10.5px] font-bold text-pink-900">
                        <span>Action</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <InstagramBrandBadge size="sm" />
                        <div className="text-[11.5px] font-bold text-slate-900 leading-tight">
                          Publish on
                          <span className="block">Instagram</span>
                        </div>
                      </div>
                    </button>

                    {/* Facebook Branch */}
                    <button
                      type="button"
                      onClick={() => setUseFacebook((v) => !v)}
                      className={`relative w-[154px] text-left rounded-2xl border bg-white transition ${
                        useFacebook
                          ? "border-blue-200 shadow-[0_8px_18px_-8px_rgba(24,119,242,0.25)]"
                          : "border-slate-200 opacity-50"
                      }`}
                    >
                      {useFacebook && (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-white ring-2 ring-white">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 rounded-t-[15px] bg-gradient-to-r from-[#DBEAFE] to-[#BFDBFE] px-3 py-1 text-[10.5px] font-bold text-blue-900">
                        <span>Action</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <FacebookBrandBadge size="sm" />
                        <div className="text-[11.5px] font-bold text-slate-900 leading-tight">
                          Publish on
                          <span className="block">Facebook</span>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Merge Connector */}
                  <svg width="46" height="118" viewBox="0 0 46 118" className="shrink-0">
                    <circle cx="3" cy="26" r="3" fill="#FFFFFF" stroke={useInstagram ? "#8B5CF6" : "#CBD5E1"} strokeWidth="2" />
                    <circle cx="3" cy="92" r="3" fill="#FFFFFF" stroke={useFacebook ? "#8B5CF6" : "#CBD5E1"} strokeWidth="2" />
                    <path
                      d="M6 26 C24 26, 22 59, 41 59"
                      fill="none"
                      stroke={useInstagram ? "#8B5CF6" : "#CBD5E1"}
                      strokeWidth="2"
                    />
                    <path
                      d="M6 92 C24 92, 22 59, 41 59"
                      fill="none"
                      stroke={useFacebook ? "#8B5CF6" : "#CBD5E1"}
                      strokeWidth="2"
                    />
                    <path
                      d="M36 55 L42 59 L36 63"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  {/* Node 4: End */}
                  <div className="relative w-[152px] shrink-0 rounded-2xl border border-violet-200 bg-white shadow-[0_8px_20px_-8px_rgba(109,40,217,0.2)]">
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-white ring-2 ring-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <div className="flex items-center gap-1.5 rounded-t-[15px] bg-[#EDE7FE] px-3 py-1.5 text-[11px] font-bold text-[#6D28D9]">
                      <Flag className="h-3.5 w-3.5" />
                      <span>End</span>
                    </div>
                    <div className="flex items-start gap-2 px-3 py-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <Flag className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-bold text-slate-900 leading-tight">
                          Post Published
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-500 leading-snug">
                          Auto publish &amp; track performance
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {conditionRule !== "none" && (
                  <div className="mt-4 flex justify-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-[11px] font-semibold text-amber-800">
                      <Filter className="h-3.5 w-3.5 text-amber-600" />
                      <span>
                        Condition applied:{" "}
                        {
                          CONDITION_OPTIONS.find((c) => c.id === conditionRule)
                            ?.label
                        }
                      </span>
                      <button
                        type="button"
                        onClick={() => setConditionRule("none")}
                        className="rounded-full p-0.5 hover:bg-amber-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Split: Workflow Details + Upcoming Scheduled Posts */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Workflow Details Card */}
              <form
                onSubmit={handleSavePipeline}
                className="lg:col-span-5 rounded-[24px] border border-violet-100/90 bg-white p-5 shadow-[0_8px_28px_rgba(91,33,182,0.04)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <Layers className="h-4 w-4" />
                    </span>
                    <h2 className="text-[15px] font-bold text-slate-900">
                      Workflow Details
                    </h2>
                  </div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setWorkflowName("");
                      }}
                      className="text-[11px] font-semibold text-violet-600 hover:underline"
                    >
                      + New
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-3 items-center gap-2">
                    <label className="font-semibold text-slate-600">
                      Workflow Name
                    </label>
                    <input
                      type="text"
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      placeholder="e.g., Weekly Promo Posts"
                      className="col-span-2 rounded-xl border border-slate-200 bg-[#FAF9FE] px-3 py-2 text-xs font-medium text-slate-900 focus:border-violet-400 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center gap-2">
                    <span className="font-semibold text-slate-600">Platform</span>
                    <div className="col-span-2 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={useInstagram}
                          onChange={(e) => setUseInstagram(e.target.checked)}
                          className="h-4 w-4 rounded accent-[#7C3AED]"
                        />
                        <InstagramBrandBadge size="xs" />
                        <span>Instagram</span>
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={useFacebook}
                          onChange={(e) => setUseFacebook(e.target.checked)}
                          className="h-4 w-4 rounded accent-[#7C3AED]"
                        />
                        <FacebookBrandBadge size="xs" />
                        <span>Facebook</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-2">
                    <label className="font-semibold text-slate-600">
                      Schedule
                    </label>
                    <div className="relative col-span-2">
                      <select
                        value={scheduleSlot}
                        onChange={(e) => setScheduleSlot(e.target.value)}
                        className="cielora-select-clean w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-medium text-slate-800 focus:border-violet-400 focus:outline-none"
                      >
                        {SCHEDULE_PRESETS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-2">
                    <label className="font-semibold text-slate-600">
                      Post Type
                    </label>
                    <div className="relative col-span-2">
                      <select
                        value={postType}
                        onChange={(e) => setPostType(e.target.value)}
                        className="cielora-select-clean w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-medium text-slate-800 focus:border-violet-400 focus:outline-none"
                      >
                        {POST_TYPES.map((pt) => (
                          <option key={pt} value={pt}>
                            {pt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="cielora-ai-btn mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </form>

              {/* Upcoming Scheduled Posts Card */}
              <div className="lg:col-span-7 rounded-[24px] border border-violet-100/90 bg-white p-5 shadow-[0_8px_28px_rgba(91,33,182,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <Calendar className="h-4 w-4" />
                    </span>
                    <h2 className="text-[15px] font-bold text-slate-900">
                      Upcoming Scheduled Posts
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setScheduleModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Schedule</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("scheduled")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED] hover:text-violet-800"
                    >
                      <span>View All</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <p className="py-10 text-center text-xs text-slate-400">
                    Loading scheduled queue...
                  </p>
                ) : scheduledPosts.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-[#FAF9FE] px-5 py-8 text-center">
                    <p className="text-xs font-bold text-slate-800">
                      No upcoming posts scheduled yet
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Schedule an Instagram or Facebook post to see it queued
                      here automatically.
                    </p>
                    <button
                      type="button"
                      onClick={() => setScheduleModalOpen(true)}
                      className="cielora-ai-btn mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Schedule First Post</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-3.5 space-y-2.5">
                    {scheduledPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        className="relative flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-[#FAF9FE] px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {post.mediaUrl ? (
                            <img
                              src={post.mediaUrl}
                              alt={post.title}
                              className="h-10 w-14 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-pink-100">
                              {post.platform === "FACEBOOK" ? (
                                <FacebookBrandBadge size="sm" />
                              ) : (
                                <InstagramBrandBadge size="sm" />
                              )}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-slate-900">
                              {post.title}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                              {post.platform === "FACEBOOK" ? (
                                <FacebookBrandBadge size="xs" />
                              ) : (
                                <InstagramBrandBadge size="xs" />
                              )}
                              <span>
                                {post.scheduledAt
                                  ? formatDate(
                                      post.scheduledAt,
                                      user.timezone,
                                      user.locale
                                    )
                                  : "Scheduled"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-[#EDE7FE] px-3 py-1 text-[11px] font-semibold text-[#6D28D9]">
                            Scheduled
                          </span>
                          <button
                            type="button"
                            aria-label="Post options"
                            onClick={() =>
                              setPostMenuId((cur) =>
                                cur === post.id ? null : post.id
                              )
                            }
                            className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>

                        {postMenuId === post.id && (
                          <div className="absolute right-3 top-12 z-20 w-40 rounded-xl border border-slate-200 bg-white p-1.5 text-xs shadow-lg">
                            <button
                              type="button"
                              onClick={() => handlePublishPostNow(post.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Publish Now</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete Post</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Pipeline Blocks Palette (3 cols) */}
          <aside className="xl:col-span-3 rounded-[24px] border border-violet-100/90 bg-white p-4 shadow-[0_8px_28px_rgba(91,33,182,0.05)]">
            <div className="flex items-center gap-2 pb-3">
              <LayoutGrid className="h-4 w-4 text-[#7C3AED]" />
              <h2 className="text-[15px] font-bold text-slate-900">
                Pipeline Blocks
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              {/* Triggers Group */}
              <div className="overflow-hidden rounded-2xl border border-violet-100 bg-[#FAF8FF]">
                <button
                  type="button"
                  onClick={() => setTriggersOpen((v) => !v)}
                  className="flex w-full items-center justify-between bg-[#EFE8FF] px-3 py-2 text-xs font-bold text-[#5B21B6]"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Triggers</span>
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      triggersOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {triggersOpen && (
                  <div className="space-y-1.5 p-2.5">
                    {TRIGGER_OPTIONS.slice(0, 3).map((item) => {
                      const Icon = item.icon;
                      const selected = triggerType === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTriggerType(item.id)}
                          className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left font-medium transition ${
                            selected
                              ? "border-violet-400 bg-white text-violet-700 shadow-2xs"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-violet-200"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                          <span className="truncate">{item.blockLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions Group */}
              <div className="overflow-hidden rounded-2xl border border-sky-100 bg-[#F7FBFF]">
                <button
                  type="button"
                  onClick={() => setActionsOpen((v) => !v)}
                  className="flex w-full items-center justify-between bg-[#E0F2FE] px-3 py-2 text-xs font-bold text-sky-900"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Actions</span>
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      actionsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {actionsOpen && (
                  <div className="space-y-1.5 p-2.5">
                    {CONTENT_ACTION_OPTIONS.map((item) => {
                      const selected = contentAction === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setContentAction(item.id)}
                          className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left font-medium transition ${
                            selected
                              ? "border-sky-400 bg-white text-sky-800 shadow-2xs"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-sky-200"
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                          <span className="truncate">{item.blockLabel}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setUseInstagram((v) => !v)}
                      className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left font-medium transition ${
                        useInstagram
                          ? "border-pink-300 bg-white text-slate-900 shadow-2xs"
                          : "border-slate-200/80 bg-white/70 text-slate-400"
                      }`}
                    >
                      <InstagramBrandBadge size="xs" />
                      <span className="truncate">Publish to Instagram</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseFacebook((v) => !v)}
                      className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left font-medium transition ${
                        useFacebook
                          ? "border-blue-300 bg-white text-slate-900 shadow-2xs"
                          : "border-slate-200/80 bg-white/70 text-slate-400"
                      }`}
                    >
                      <FacebookBrandBadge size="xs" />
                      <span className="truncate">Publish to Facebook</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Conditions Group */}
              <div className="overflow-hidden rounded-2xl border border-amber-100 bg-[#FFFBF5]">
                <button
                  type="button"
                  onClick={() => setConditionsOpen((v) => !v)}
                  className="flex w-full items-center justify-between bg-[#FEF0D6] px-3 py-2 text-xs font-bold text-amber-900"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    <span>Conditions</span>
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      conditionsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {conditionsOpen && (
                  <div className="space-y-1.5 p-2.5">
                    {CONDITION_OPTIONS.slice(1).map((cond) => {
                      const selected = conditionRule === cond.id;
                      return (
                        <button
                          key={cond.id}
                          type="button"
                          onClick={() =>
                            setConditionRule((cur) =>
                              cur === cond.id ? "none" : cond.id
                            )
                          }
                          className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left font-medium transition ${
                            selected
                              ? "border-amber-400 bg-white text-amber-900 shadow-2xs"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-amber-200"
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <span className="truncate">{cond.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* TAB: WORKFLOWS LIST */}
      {activeTab === "workflows" && (
        <div className="rounded-[24px] border border-violet-100/90 bg-white p-6 shadow-[0_8px_28px_rgba(91,33,182,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Saved Automation Workflows
              </h2>
              <p className="text-xs text-slate-500">
                Manage visual social pipelines and event-driven CRM/messaging rules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCrmRuleOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add CRM Trigger Rule</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setWorkflowName("");
                  setActiveTab("pipeline");
                }}
                className="cielora-gradient-btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white"
              >
                <GitFork className="h-3.5 w-3.5" />
                <span>New Pipeline</span>
              </button>
            </div>
          </div>

          {workflows.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-[#FAF9FE] p-10 text-center">
              <p className="text-sm font-bold text-slate-800">
                No automation workflows saved yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Use the Automation Pipeline builder or add a CRM trigger rule to
                automate your workspace.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="rounded-2xl border border-slate-200/80 bg-[#FAF9FE] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          wf.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {wf.isActive ? "Active" : "Paused"}
                      </span>
                      <span className="text-[11px] font-semibold text-violet-600">
                        {wf.triggerType.replaceAll("_", " ")} →{" "}
                        {wf.actionChannel.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {wf.isActive && (
                        <button
                          type="button"
                          onClick={() => runTriggerRow(wf.id)}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
                        >
                          Run
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => loadWorkflowIntoBuilder(wf)}
                        title="Open in builder"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-violet-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleWorkflowRow(wf)}
                        title={wf.isActive ? "Pause" : "Activate"}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-white"
                      >
                        {wf.isActive ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWorkflowRow(wf.id)}
                        title="Delete workflow"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900">
                    {wf.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">{wf.actionTemplate}</p>
                  <div className="mt-3 flex justify-between border-t border-slate-200/70 pt-2 text-[11px] text-slate-500">
                    <span>
                      Executions:{" "}
                      <strong className="text-slate-800">
                        {formatNumber(wf.executionCount, user.locale)}
                      </strong>
                    </span>
                    <span>
                      {wf.lastExecutedAt
                        ? `Last run ${formatDate(wf.lastExecutedAt, user.timezone, user.locale)}`
                        : "Not run yet"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: SCHEDULED POSTS */}
      {activeTab === "scheduled" && (
        <div className="rounded-[24px] border border-violet-100/90 bg-white p-6 shadow-[0_8px_28px_rgba(91,33,182,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Scheduled Posts Queue
              </h2>
              <p className="text-xs text-slate-500">
                Manage scheduled social media posts queued by your automation
                pipelines.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="cielora-gradient-btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Schedule Post</span>
            </button>
          </div>

          {scheduledPosts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-[#FAF9FE] p-10 text-center">
              <p className="text-sm font-bold text-slate-800">
                No scheduled posts in queue
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Schedule a post now or compose one in Social Marketing.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {scheduledPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-[#FAF9FE] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {post.platform === "FACEBOOK" ? (
                      <FacebookBrandBadge size="md" />
                    ) : (
                      <InstagramBrandBadge size="md" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {post.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {post.scheduledAt
                          ? formatDate(post.scheduledAt, user.timezone, user.locale)
                          : "Scheduled"}
                        {" • "}
                        {post.content.slice(0, 72)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePublishPostNow(post.id)}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Publish Now
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: CONTENT LIBRARY */}
      {activeTab === "library" && (
        <div className="rounded-[24px] border border-violet-100/90 bg-white p-6 shadow-[0_8px_28px_rgba(91,33,182,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Content Library
              </h2>
              <p className="text-xs text-slate-500">
                Reusable posts &amp; creative templates stored in your workspace.
              </p>
            </div>
            <Link
              href="/social"
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
            >
              <span>Open Content Studio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {posts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-[#FAF9FE] p-10 text-center text-xs text-slate-500">
              No content assets yet — create posts in Social Marketing or
              schedule one to build your library.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#FAF9FE] p-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      {post.platform === "FACEBOOK" ? (
                        <FacebookBrandBadge size="sm" />
                      ) : (
                        <InstagramBrandBadge size="sm" />
                      )}
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                        {post.status}
                      </span>
                    </div>
                    <h3 className="mt-2.5 text-xs font-bold text-slate-900">
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                      {post.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setContentAction("content-library");
                      setWorkflowName(`${post.title} Flow`);
                      setActiveTab("pipeline");
                    }}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-violet-50 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                  >
                    <span>Use in Pipeline</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-violet-100 bg-white p-5">
            <div className="text-xs font-semibold text-slate-500">
              Total Workflow Executions
            </div>
            <div className="mt-1 text-3xl font-extrabold text-slate-900">
              {formatNumber(totalExecutions, user.locale)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Across {workflows.length} configured automation rules
            </p>
          </div>
          <div className="rounded-[24px] border border-violet-100 bg-white p-5">
            <div className="text-xs font-semibold text-slate-500">
              Social Post Reach
            </div>
            <div className="mt-1 text-3xl font-extrabold text-violet-700">
              {formatNumber(totalReach, user.locale)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              From {publishedPosts.length} published social posts
            </p>
          </div>
          <div className="rounded-[24px] border border-violet-100 bg-white p-5">
            <div className="text-xs font-semibold text-slate-500">
              Total Engagements
            </div>
            <div className="mt-1 text-3xl font-extrabold text-pink-600">
              {formatNumber(totalEngagement, user.locale)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Likes, comments &amp; shares recorded
            </p>
          </div>
        </div>
      )}

      {/* TAB: SETTINGS */}
      {activeTab === "settings" && (
        <div className="rounded-[24px] border border-violet-100/90 bg-white p-6 shadow-[0_8px_28px_rgba(91,33,182,0.05)]">
          <h2 className="text-base font-bold text-slate-900">
            Connected Channels &amp; Publishing Settings
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Social automation pipelines publish directly through your connected
            Meta accounts.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-[#FAF9FE] p-4">
              <div className="flex items-center gap-3">
                <InstagramBrandBadge size="md" />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Instagram Business
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {igConnected ? "Connected & Ready" : "Not connected yet"}
                  </div>
                </div>
              </div>
              <Link
                href="/integrations"
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200"
              >
                <span>{igConnected ? "Manage" : "Connect"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-[#FAF9FE] p-4">
              <div className="flex items-center gap-3">
                <FacebookBrandBadge size="md" />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Facebook Page
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {fbConnected ? "Connected & Ready" : "Not connected yet"}
                  </div>
                </div>
              </div>
              <Link
                href="/integrations"
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200"
              >
                <span>{fbConnected ? "Manage" : "Connect"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Workspace timezone active: <strong>{user.timezone}</strong> (edit
              anytime in Global Settings).
            </span>
          </div>
        </div>
      )}

      {/* Quick Schedule Post Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setScheduleModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Schedule Social Post
              </h2>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSchedulePost} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Post Title
                </label>
                <input
                  type="text"
                  required
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="e.g., Weekend Special Offer"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Platform
                  </label>
                  <select
                    value={newPostPlatform}
                    onChange={(e) =>
                      setNewPostPlatform(
                        e.target.value as "INSTAGRAM" | "FACEBOOK"
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="FACEBOOK">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Publish Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newPostDate}
                    onChange={(e) => setNewPostDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Caption
                </label>
                <textarea
                  rows={3}
                  required
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Write your post caption..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPost}
                  className="cielora-gradient-btn rounded-xl px-5 py-2 font-bold text-white"
                >
                  {creatingPost ? "Scheduling..." : "Schedule Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRM Trigger Rule Modal */}
      {crmRuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setCrmRuleOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Create CRM Trigger Rule
              </h2>
              <button
                type="button"
                onClick={() => setCrmRuleOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCrmRule} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Workflow Name
                </label>
                <input
                  type="text"
                  required
                  value={crmName}
                  onChange={(e) => setCrmName(e.target.value)}
                  placeholder="e.g., Instant Lead Welcome"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Trigger Event
                </label>
                <select
                  value={crmTrigger}
                  onChange={(e) => setCrmTrigger(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <option value="LEAD_CREATED">When a new Lead is created</option>
                  <option value="CAMPAIGN_CLICKED">When a Campaign link is clicked</option>
                  <option value="MESSAGE_DELIVERED">When a Message is delivered</option>
                  <option value="STAGE_CHANGED">When CRM Stage changes</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Action Channel
                </label>
                <select
                  value={crmChannel}
                  onChange={(e) => setCrmChannel(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <option value="WHATSAPP">Send WhatsApp Message</option>
                  <option value="EMAIL">Send Email</option>
                  <option value="SMS">Send SMS</option>
                  <option value="INTERNAL_ALERT">Workspace Alert</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Message Template
                </label>
                <textarea
                  rows={3}
                  required
                  value={crmTemplate}
                  onChange={(e) => setCrmTemplate(e.target.value)}
                  placeholder="Hi {{name}}, thanks for connecting with us!"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCrmRuleOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="cielora-gradient-btn rounded-xl px-5 py-2 font-bold text-white"
                >
                  {saving ? "Saving..." : "Activate Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
