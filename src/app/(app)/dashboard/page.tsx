"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/Badge";
import { Users, Bot, MessageSquare, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDateTime, truncate } from "@/lib/utils";

interface DashboardData {
  totalClients: number;
  totalDemos: number;
  activeDemos: number;
  totalTesters: number;
  recentConversations: any[];
  recentErrors: any[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div>
      <Header title="Dashboard" description="Resumen general de tu actividad" />

      {!data ? (
        <div className="text-gray-400 text-sm py-10 text-center">Cargando...</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Clientes"
              value={data.totalClients}
              color="bg-blue-500"
            />
            <StatCard
              icon={Bot}
              label="Demos activas"
              value={data.activeDemos}
              sub={`${data.totalDemos} en total`}
              color="bg-green-500"
            />
            <StatCard
              icon={MessageSquare}
              label="Testers autorizados"
              value={data.totalTesters}
              color="bg-purple-500"
            />
            <StatCard
              icon={CheckCircle}
              label="Total demos"
              value={data.totalDemos}
              color="bg-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Últimas conversaciones
              </h2>
              {data.recentConversations.length === 0 ? (
                <p className="text-sm text-gray-400">Sin conversaciones aún.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentConversations.map((c: any) => (
                    <div key={c.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-700">
                          {c.tester?.name?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{c.tester?.name}</p>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-gray-500 truncate">{c.demo?.name}</p>
                        {c.lastMessage && (
                          <p className="text-xs text-gray-400 truncate">{truncate(c.lastMessage, 50)}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {c.lastMessageAt ? formatDateTime(c.lastMessageAt) : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Últimos errores de webhook
              </h2>
              {data.recentErrors.length === 0 ? (
                <p className="text-sm text-gray-400">Sin errores recientes.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentErrors.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={log.status} />
                          <p className="text-xs text-gray-500">{log.demo?.name}</p>
                        </div>
                        {log.errorMessage && (
                          <p className="text-xs text-red-500 truncate mt-0.5">{log.errorMessage}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
