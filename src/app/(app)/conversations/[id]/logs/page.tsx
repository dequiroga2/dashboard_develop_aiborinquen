"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-64 leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function ConversationLogsPage() {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/conversations/${id}/logs`)
      .then((r) => r.json())
      .then(setLogs);
  }, [id]);

  return (
    <div>
      <div className="mb-6">
        <Link href={`/conversations/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Volver a la conversación
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Logs técnicos</h1>

      {logs.length === 0 ? (
        <p className="text-gray-400 text-sm">Sin logs para esta conversación.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                <div className="flex items-center gap-4">
                  <StatusBadge status={log.status} />
                  <span className="text-sm text-gray-600">{formatDateTime(log.createdAt)}</span>
                  <span className="text-sm text-gray-500">Proveedor: {log.provider}</span>
                  {log.responseTimeMs && (
                    <span className="text-xs text-gray-400">{log.responseTimeMs}ms</span>
                  )}
                </div>
                <span className="text-gray-400 text-sm">{expanded === log.id ? "▲" : "▼"}</span>
              </button>

              {expanded === log.id && (
                <div className="px-6 pb-6 space-y-4 border-t border-gray-100">
                  {log.errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-700">Error:</p>
                      <p className="text-sm text-red-600 mt-1">{log.errorMessage}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Payload entrante (proveedor)
                    </p>
                    <JsonBlock data={log.inboundPayload} />
                  </div>

                  {log.normalizedPayload && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Payload normalizado
                      </p>
                      <JsonBlock data={log.normalizedPayload} />
                    </div>
                  )}

                  {log.n8nPayload && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Payload enviado a n8n
                      </p>
                      <JsonBlock data={log.n8nPayload} />
                    </div>
                  )}

                  {log.n8nResponse && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Respuesta de n8n
                      </p>
                      <JsonBlock data={log.n8nResponse} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
