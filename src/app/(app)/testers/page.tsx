"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/Badge";
import { Power, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function TestersPage() {
  const [testers, setTesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const data = await fetch("/api/testers").then((r) => r.json());
    setTesters(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/testers/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    load();
  }

  // Group testers by normalizedPhone
  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = testers.filter((t) =>
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      t.normalizedPhone.includes(q) ||
      t.demo?.name.toLowerCase().includes(q)
    );

    const map = new Map<string, { phone: string; name: string; entries: any[] }>();
    for (const t of filtered) {
      const key = t.normalizedPhone;
      if (!map.has(key)) {
        map.set(key, { phone: t.phone, name: t.name, entries: [] });
      }
      map.get(key)!.entries.push(t);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [testers, search]);

  // Auto-expand groups with multiple demos
  useEffect(() => {
    const toExpand = new Set<string>();
    for (const group of grouped) {
      if (group.entries.length > 1) toExpand.add(group.phone);
    }
    setExpanded(toExpand);
  }, [grouped]);

  function toggleGroup(phone: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  }

  const totalActive = testers.filter((t) => t.active).length;
  const totalDemos = new Set(testers.map((t) => t.demo?.id)).size;

  return (
    <div>
      <Header
        title="Testers"
        description={`${grouped.length} números · ${testers.length} entradas en ${totalDemos} demos · ${totalActive} activos`}
      />

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o demo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm py-10">Cargando...</p>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-500">No hay testers registrados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => {
            const isOpen = expanded.has(group.phone);
            const allActive = group.entries.every((e) => e.active);
            const someActive = group.entries.some((e) => e.active);
            const hasMultiple = group.entries.length > 1;

            return (
              <div key={group.phone} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Group header */}
                <div
                  className={`flex items-center gap-3 px-5 py-4 ${hasMultiple ? "cursor-pointer hover:bg-gray-50" : ""}`}
                  onClick={() => hasMultiple && toggleGroup(group.phone)}
                >
                  {hasMultiple && (
                    <span className="text-gray-400">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{group.name}</span>
                      {hasMultiple && (
                        <span className="text-xs bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded-full">
                          {group.entries.length} demos
                        </span>
                      )}
                      {!someActive && (
                        <span className="text-xs bg-gray-100 text-gray-500 font-medium px-1.5 py-0.5 rounded-full">
                          Todos inactivos
                        </span>
                      )}
                      {someActive && !allActive && hasMultiple && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 font-medium px-1.5 py-0.5 rounded-full">
                          Parcialmente activo
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-gray-500">{group.phone}</span>
                  </div>

                  {/* Single demo row inline (when not multiple) */}
                  {!hasMultiple && group.entries[0] && (
                    <SingleRow entry={group.entries[0]} onToggle={toggleActive} />
                  )}
                </div>

                {/* Expanded rows for multiple demos */}
                {hasMultiple && isOpen && (
                  <div className="border-t border-gray-100">
                    {group.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 px-5 py-3 border-b last:border-b-0 border-gray-50 hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0 pl-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/demos/${entry.demo?.id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              {entry.demo?.name}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                            <StatusBadge status={entry.demo?.status} />
                            <StatusBadge status={entry.role} />
                          </div>
                          <span className="text-xs text-gray-400">{formatDate(entry.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={entry.active ? "active" : "inactive"} />
                          <button
                            onClick={() => toggleActive(entry.id, entry.active)}
                            title={entry.active ? "Desactivar en esta demo" : "Activar en esta demo"}
                            className={`p-1.5 rounded transition-colors ${
                              entry.active
                                ? "text-blue-600 hover:bg-blue-50"
                                : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SingleRow({ entry, onToggle }: { entry: any; onToggle: (id: string, active: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/demos/${entry.demo?.id}`}
        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {entry.demo?.name}
        <ExternalLink className="w-3 h-3" />
      </Link>
      <StatusBadge status={entry.demo?.status} />
      <StatusBadge status={entry.role} />
      <StatusBadge status={entry.active ? "active" : "inactive"} />
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(entry.id, entry.active); }}
        title={entry.active ? "Desactivar" : "Activar"}
        className={`p-1.5 rounded transition-colors ${
          entry.active ? "text-blue-600 hover:bg-blue-50" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
        }`}
      >
        <Power className="w-4 h-4" />
      </button>
    </div>
  );
}
