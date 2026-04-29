"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime, truncate } from "@/lib/utils";

export default function DemoConversationsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [demo, setDemo] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/demos/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!d) { router.push("/demos"); return; } setDemo(d); });

    fetch(`/api/demos/${id}/conversations`)
      .then((r) => r.json())
      .then(setConversations);
  }, [id]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/demos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Volver a demos
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{demo?.name}</h1>
      <p className="text-sm text-gray-500 mb-6">Conversaciones de esta demo</p>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Sin conversaciones aún.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tester</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Último mensaje</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Última actividad</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conversations.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{c.tester?.name}</p>
                    <span className="text-xs text-gray-400">{c.tester?.role}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{c.phone}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs">
                    {c.lastMessage ? truncate(c.lastMessage, 60) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {c.lastMessageAt ? formatDateTime(c.lastMessageAt) : "—"}
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
