"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users, Plus, Pencil, Trash2, Bot } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { ClientForm } from "@/components/clients/ClientForm";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    load();
  }

  function handleSaved() {
    setShowForm(false);
    setEditing(null);
    load();
  }

  return (
    <div>
      <Header
        title="Clientes"
        description="Gestiona los clientes de tus demos"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nuevo cliente
          </Button>
        }
      />

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin clientes"
          description="Crea tu primer cliente para empezar a configurar demos."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Crear cliente
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Demos</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    {c.companyName && <p className="text-xs text-gray-500">{c.companyName}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700">{c.contactName || "—"}</p>
                    <p className="text-xs text-gray-400">{c.contactEmail || c.contactPhone || ""}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/clients/${c.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      <Bot className="w-3 h-3" />
                      {c._count?.demos ?? 0} demos
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(c.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setEditing(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm || !!editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Editar cliente" : "Nuevo cliente"}
      >
        <ClientForm
          initial={editing}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
