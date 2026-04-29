"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageSquare } from "lucide-react";
import { formatDateTime, truncate } from "@/lib/utils";

export default function ConversationsPage() {
  const [demos, setDemos] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemo, setSelectedDemo] = useState<string>("all");

  useEffect(() => {
    fetch("/api/demos")
      .then((r) => r.json())
      .then(setDemos);
  }, []);

  useEffect(() => {
    const filtered = demos.filter((d) => selectedDemo === "all" || d.id === selectedDemo);
    Promise.all(
      filtered.map((d) =>
        fetch(`/api/demos/${d.id}/conversations`)
          .then((r) => r.json())
          .then((convs) => convs.map((c: any) => ({ ...c, _demo: d })))
      )
    ).then((results) => {
      const all = results.flat().sort(
        (a, b) =>
          new Date(b.lastMessageAt || b.createdAt).getTime() -
          new Date(a.lastMessageAt || a.createdAt).getTime()
      );
      setConversations(all);
      setLoading(false);
    });
  }, [demos, selectedDemo]);

  return (
    <div>
      <Header title="Conversaciones" description="Todas las conversaciones de tus demos" />

      <div className="mb-4 flex items-center gap-3">
        <select
          value={selectedDemo}
          onChange={(e) => setSelectedDemo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Todas las demos</option>
          {demos.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Sin conversaciones"
          description="Las conversaciones aparecen aquí cuando alguien envía un mensaje a una demo activa."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tester</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Demo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Canal</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Último mensaje</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actividad</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conversations.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{c.tester?.name}</p>
                    <p className="text-xs font-mono text-gray-400">{c.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700">{c._demo?.name}</p>
                    <p className="text-xs text-gray-400">{c._demo?.client?.name}</p>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={c.channel} /></td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs">
                    {c.lastMessage ? truncate(c.lastMessage, 50) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {c.lastMessageAt ? formatDateTime(c.lastMessageAt) : formatDateTime(c.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/conversations/${c.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Ver chat
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
