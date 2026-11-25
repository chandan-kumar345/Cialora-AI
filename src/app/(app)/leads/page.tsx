"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, Plus, Search, Trash2, Users } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceProvider";
import {
  formatCurrency,
  formatDate,
  getCurrencyMeta,
  toMinorUnits,
} from "@/lib/format";
import { LEAD_STAGES } from "@/lib/validation";

interface LeadItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  sourceChannel: string;
  stage: string;
  estimatedValueCents: number;
  tags: string;
  createdAt: string;
}

export default function LeadsCrmPage() {
  const { user } = useWorkspace();
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [sourceChannel, setSourceChannel] = useState("WHATSAPP");
  const [valueMajor, setValueMajor] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyMeta = getCurrencyMeta(user.currency);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (stageFilter !== "ALL") qs.set("stage", stageFilter);
      if (search.trim()) qs.set("search", search.trim());
      const res = await fetch(`/api/leads?${qs.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const d = await res.json();
        setLeads(d.leads ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [stageFilter, search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const estimatedValueCents = toMinorUnits(
        Number(valueMajor || "0"),
        user.currency
      );
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          company: company || undefined,
          sourceChannel,
          estimatedValueCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add lead.");
        return;
      }
      setFullName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setValueMajor("0");
      loadLeads();
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (id: string, stage: string) => {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    loadLeads();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    loadLeads();
  };

  const totalPipeline = leads.reduce((s, l) => s + l.estimatedValueCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Leads CRM</h1>
            <p className="text-xs text-slate-500">
              Pipeline value:{" "}
              <span className="font-bold text-slate-800">
                {formatCurrency(totalPipeline, user.currency, user.locale)}
              </span>{" "}
              across {leads.length} isolated leads
            </p>
          </div>
        </div>

        <a
          href="/api/leads/export"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Safe CSV</span>
        </a>
      </div>

      {/* Add Lead Form */}
      <form
        onSubmit={handleCreate}
        className="rounded-3xl border border-slate-200 bg-white p-5 text-xs space-y-3"
      >
        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Plus className="h-4 w-4 text-violet-600" />
          <span>Add Global Lead</span>
        </div>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name *"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="E.164 phone (+14155552671)"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          />
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          />
          <input
            type="number"
            min="0"
            step={currencyMeta.decimals === 0 ? "1" : "0.01"}
            value={valueMajor}
            onChange={(e) => setValueMajor(e.target.value)}
            placeholder={`Deal value (${currencyMeta.symbol})`}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          />
          <div className="flex gap-2">
            <select
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value)}
              className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="META_ADS">Meta Ads</option>
              <option value="GOOGLE_ADS">Google Ads</option>
              <option value="EMAIL">Email</option>
              <option value="DIRECT">Direct</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="cielora-gradient-btn flex-1 rounded-xl font-bold text-white"
            >
              {saving ? "..." : "Add"}
            </button>
          </div>
        </div>
      </form>

      {/* Filters & Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by name, email, company, phone..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
          >
            <option value="ALL">All Stages</option>
            {LEAD_STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">Loading leads...</p>
        ) : leads.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500">
            No leads in your CRM yet. Add your first prospect above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                  <th className="py-3">Lead</th>
                  <th className="py-3">Contact</th>
                  <th className="py-3">Company</th>
                  <th className="py-3">Source</th>
                  <th className="py-3 text-right">Est. Value</th>
                  <th className="py-3">Stage</th>
                  <th className="py-3 text-right">Added</th>
                  <th className="py-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="py-3 font-bold text-slate-900">
                      {lead.fullName}
                    </td>
                    <td className="py-3 text-slate-600">
                      <div>{lead.email || "—"}</div>
                      <div className="text-[11px] text-slate-400">
                        {lead.phone || ""}
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">{lead.company || "—"}</td>
                    <td className="py-3 text-slate-600">{lead.sourceChannel}</td>
                    <td className="py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(
                        lead.estimatedValueCents,
                        user.currency,
                        user.locale
                      )}
                    </td>
                    <td className="py-3">
                      <select
                        value={lead.stage}
                        onChange={(e) =>
                          handleStageChange(lead.id, e.target.value)
                        }
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold"
                      >
                        {LEAD_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 text-right text-slate-400">
                      {formatDate(lead.createdAt, user.timezone, user.locale)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(lead.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
