"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Calendar, Layers, Plus, Send, Trash2 } from "lucide-react";
import { ChannelBadge, StatusBadge } from "@/components/ChannelBadge";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { formatDate, formatNumber } from "@/lib/format";

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

export default function SocialMarketingPage() {
  const { user } = useWorkspace();
  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"studio" | "calendar">("studio");

  const [platform, setPlatform] = useState("INSTAGRAM");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "SCHEDULED" | "PUBLISHED">("DRAFT");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          title,
          content,
          status,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save post.");
        return;
      }
      setTitle("");
      setContent("");
      setScheduledAt("");
      loadPosts();
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    await fetch(`/api/social/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    loadPosts();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/social/${id}`, { method: "DELETE" });
    loadPosts();
  };

  const displayed =
    view === "calendar"
      ? posts.filter((p) => p.status === "SCHEDULED" || p.scheduledAt)
      : posts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Social Marketing</h1>
            <p className="text-xs text-slate-500">
              Plan, schedule, and publish social content across global platforms.
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setView("studio")}
            className={`rounded-full px-4 py-1.5 ${
              view === "studio" ? "bg-violet-600 text-white" : "text-slate-600"
            }`}
          >
            Content Studio
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 ${
              view === "calendar" ? "bg-violet-600 text-white" : "text-slate-600"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Scheduled ({posts.filter((p) => p.status === "SCHEDULED").length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Composer */}
        <form
          onSubmit={handleCreate}
          className="lg:col-span-4 rounded-3xl border border-slate-200/80 bg-white p-5 space-y-3.5 text-xs h-fit"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Plus className="h-4 w-4 text-violet-600" />
            <span>Compose Social Post</span>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <option value="INSTAGRAM">Instagram</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="X">X (Twitter)</option>
              <option value="YOUTUBE">YouTube</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Post Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Global Launch Teaser"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Caption / Copy</label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your social post caption..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Status</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "DRAFT" | "SCHEDULED" | "PUBLISHED")
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PUBLISHED">Publish Now</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Schedule Time
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="cielora-gradient-btn w-full rounded-xl py-2.5 font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Social Post"}
          </button>
        </form>

        {/* Post Feed */}
        <div className="lg:col-span-8 space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
              Loading posts...
            </div>
          ) : displayed.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <p className="text-sm font-bold text-slate-800">No social posts yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Use the composer to draft, schedule, or publish your first social post.
              </p>
            </div>
          ) : (
            displayed.map((post) => (
              <div
                key={post.id}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <ChannelBadge channel={post.platform} />
                    <StatusBadge status={post.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {post.status !== "PUBLISHED" && (
                      <button
                        type="button"
                        onClick={() => handlePublish(post.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Send className="h-3 w-3" />
                        <span>Publish</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900">{post.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 whitespace-pre-line">
                  {post.content}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                  <span>
                    Created {formatDate(post.createdAt, user.timezone, user.locale)}
                    {post.scheduledAt &&
                      ` · Scheduled ${formatDate(post.scheduledAt, user.timezone, user.locale)}`}
                  </span>
                  <div className="flex items-center gap-4 font-semibold text-slate-700">
                    <span>Reach: {formatNumber(post.reachCount, user.locale)}</span>
                    <span>Likes: {formatNumber(post.likesCount, user.locale)}</span>
                    <span>Shares: {formatNumber(post.sharesCount, user.locale)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
