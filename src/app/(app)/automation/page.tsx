"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Pause, Play, Plus, Trash2, Zap } from "lucide-react";
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

export default function AutomationPage() {
  const { user } = useWorkspace();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("LEAD_CREATED");
  const [actionChannel, setActionChannel] = useState("WHATSAPP");
  const [actionTemplate, setActionTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/automation", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setWorkflows(d.workflows ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          triggerType,
          actionChannel,
          actionTemplate,
          isActive: true,
        }),
      });
      if (res.ok) {
        setName("");
        setActionTemplate("");
        loadWorkflows();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (wf: WorkflowItem) => {
    await fetch(`/api/automation/${wf.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !wf.isActive }),
    });
    loadWorkflows();
  };

  const runNow = async (id: string) => {
    await fetch(`/api/automation/${id}/trigger`, { method: "POST" });
    loadWorkflows();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/automation/${id}`, { method: "DELETE" });
    loadWorkflows();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
          <Zap className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Automation Journeys</h1>
          <p className="text-xs text-slate-500">
            Configure trigger-driven customer journeys that run automatically inside your workspace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleCreate}
          className="lg:col-span-4 rounded-3xl border border-slate-200 bg-white p-5 space-y-3.5 text-xs h-fit"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Plus className="h-4 w-4 text-violet-600" />
            <span>Create Journey Rule</span>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Workflow Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Instant Lead Welcome"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Trigger Event
            </label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
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
              value={actionChannel}
              onChange={(e) => setActionChannel(e.target.value)}
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
              Message / Action Template
            </label>
            <textarea
              rows={3}
              required
              value={actionTemplate}
              onChange={(e) => setActionTemplate(e.target.value)}
              placeholder="Hi {{name}}, thanks for connecting with us!"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="cielora-gradient-btn w-full rounded-xl py-2.5 font-bold text-white"
          >
            {saving ? "Saving..." : "Activate Workflow"}
          </button>
        </form>

        <div className="lg:col-span-8 space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
              Loading automations...
            </div>
          ) : workflows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <p className="text-sm font-bold text-slate-800">
                No automation journeys configured
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Create a &quot;Lead Created&quot; rule and every new lead in CRM
                will automatically increment its execution telemetry.
              </p>
            </div>
          ) : (
            workflows.map((wf) => (
              <div
                key={wf.id}
                className="rounded-3xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        wf.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {wf.isActive ? "Active" : "Paused"}
                    </span>
                    <span className="text-[11px] font-semibold text-violet-600">
                      {wf.triggerType.replaceAll("_", " ")} →{" "}
                      {wf.actionChannel.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {wf.isActive && (
                      <button
                        type="button"
                        onClick={() => runNow(wf.id)}
                        className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700 hover:bg-violet-100"
                      >
                        Run Trigger
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleActive(wf)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      {wf.isActive ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(wf.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="mt-2.5 text-sm font-bold text-slate-900">
                  {wf.name}
                </h3>
                <p className="mt-1 text-xs text-slate-600">{wf.actionTemplate}</p>
                <div className="mt-3 flex justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                  <span>
                    Executions:{" "}
                    <strong className="text-slate-800">
                      {formatNumber(wf.executionCount, user.locale)}
                    </strong>
                  </span>
                  <span>
                    {wf.lastExecutedAt
                      ? `Last run ${formatDate(wf.lastExecutedAt, user.timezone, user.locale)}`
                      : "Not executed yet"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
