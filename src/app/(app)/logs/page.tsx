"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs overflow-auto max-h-48 leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function LogsPage() {
  const [data, setData] = useState<any>({ logs: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load(p: number) {
    setLoading(true);
    const res = await fetch(`/api/logs?page=${p}`);
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(page); }, [page]);

  return (
    <div>
      <Header title="Logs técnicos" description="Registro de todos los eventos del webhook" />

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : data.logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Sin logs aún"
          description="Los logs aparecerán aquí cuando el sistema reciba mensajes entrantes."
        />
      ) : (
        <div className="space-y-2">
          {data.logs.map((log: any) => (
            <div key={log.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <StatusBadge status={log.status} />
                  <span className="text-sm text-gray-600">{formatDateTime(log.createdAt)}</span>
                  <span className="text-sm text-gray-500 font-medium">{log.demo?.name || "—"}</span>
                  <span className="text-xs text-gray-400">Proveedor: {log.provider}</span>
                  {log.responseTimeMs && (
                    <span className="text-xs text-gray-400">{log.responseTimeMs}ms</span>
                  )}
                  {log.errorMessage && (
                    <span className="text-xs text-red-500 truncate max-w-xs">{log.errorMessage}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {log.conversationId && (
                    <Link
                      href={`/conversations/${log.conversationId}`}
                      className="text-xs text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver conv.
                    </Link>
                  )}
                  <span className="text-gray-400 text-sm">{expanded === log.id ? "▲" : "▼"}</span>
                </div>
              </button>

              {expanded === log.id && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                  {log.errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-700">Error: {log.errorMessage}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payload entrante</p>
                    <JsonBlock data={log.inboundPayload} />
                  </div>
                  {log.normalizedPayload && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Normalizado</p>
                      <JsonBlock data={log.normalizedPayload} />
                    </div>
                  )}
                  {log.n8nPayload && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payload a n8n</p>
                      <JsonBlock data={log.n8nPayload} />
                    </div>
                  )}
                  {log.n8nResponse && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Respuesta n8n</p>
                      <JsonBlock data={log.n8nResponse} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between py-4">
            <p className="text-sm text-gray-500">{data.total} logs en total</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                disabled={page * data.limit >= data.total}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
