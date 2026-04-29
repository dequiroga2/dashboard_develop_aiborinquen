"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { DemoForm } from "@/components/demos/DemoForm";
import { Bot, Plus, MessageSquare, Settings, Power } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DemosPage() {
  const [demos, setDemos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/demos");
    setDemos(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleStatus(demo: any) {
    const newStatus = demo.status === "active" ? "inactive" : "active";
    await fetch(`/api/demos/${demo.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  return (
    <div>
      <Header
        title="Demos"
        description="Gestiona tus demos de chatbots"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nueva demo
          </Button>
        }
      />

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : demos.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Sin demos"
          description="Crea tu primera demo para empezar a enrutar mensajes."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Crear demo
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {demos.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/demos/${d.id}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">{d.name}</h3>
                    </Link>
                    <StatusBadge status={d.status} />
                    <StatusBadge status={d.channel} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {d.client?.name} · Bot: <span className="font-medium">{d.botName}</span>
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{d._count?.testers || 0} testers</span>
                    <span>{d._count?.conversations || 0} conversaciones</span>
                    <span>Actualizado {formatDate(d.updatedAt)}</span>
                    {d.n8nWebhookUrl ? (
                      <span className="text-green-600 font-medium">Webhook configurado</span>
                    ) : (
                      <span className="text-orange-500 font-medium">Webhook pendiente</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/demos/${d.id}/conversations`}>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="w-3.5 h-3.5" /> Conversaciones
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => setEditing(d)}>
                    <Settings className="w-3.5 h-3.5" /> Configurar
                  </Button>
                  <Button
                    variant={d.status === "active" ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => toggleStatus(d)}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {d.status === "active" ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm || !!editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Editar demo" : "Nueva demo"}
        size="lg"
      >
        <DemoForm
          initial={editing}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
