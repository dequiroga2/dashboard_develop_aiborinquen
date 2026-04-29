"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { DemoForm } from "@/components/demos/DemoForm";
import { ArrowLeft, Plus, Pencil, Trash2, Power, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { normalizePhone } from "@/lib/normalize";

export default function DemoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [demo, setDemo] = useState<any>(null);
  const [testers, setTesters] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddTester, setShowAddTester] = useState(false);
  const [editTester, setEditTester] = useState<any>(null);
  const [testerForm, setTesterForm] = useState({ name: "", phone: "", role: "tester" });
  const [testerError, setTesterError] = useState("");
  const [savingTester, setSavingTester] = useState(false);

  async function load() {
    const [demoRes, testersRes] = await Promise.all([
      fetch(`/api/demos/${id}`),
      fetch(`/api/demos/${id}/testers`),
    ]);
    if (!demoRes.ok) { router.push("/demos"); return; }
    setDemo(await demoRes.json());
    setTesters(await testersRes.json());
  }

  useEffect(() => { load(); }, [id]);

  async function toggleStatus() {
    const newStatus = demo.status === "active" ? "inactive" : "active";
    await fetch(`/api/demos/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  async function saveTester(e: React.FormEvent) {
    e.preventDefault();
    setTesterError("");
    setSavingTester(true);

    const url = editTester ? `/api/testers/${editTester.id}` : `/api/demos/${id}/testers`;
    const method = editTester ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testerForm),
    });

    setSavingTester(false);

    if (!res.ok) {
      const data = await res.json();
      setTesterError(typeof data.error === "string" ? data.error : "Error al guardar");
      return;
    }

    setShowAddTester(false);
    setEditTester(null);
    setTesterForm({ name: "", phone: "", role: "tester" });
    load();
  }

  async function deleteTester(testerId: string) {
    if (!confirm("¿Eliminar este tester?")) return;
    await fetch(`/api/testers/${testerId}`, { method: "DELETE" });
    load();
  }

  async function toggleTester(testerId: string, active: boolean) {
    await fetch(`/api/testers/${testerId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    load();
  }

  if (!demo) return <div className="text-gray-400 text-sm py-10">Cargando...</div>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/demos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Volver a demos
        </Link>
      </div>

      <Header
        title={demo.name}
        description={`${demo.client?.name} · ${demo.botName}`}
        action={
          <div className="flex gap-2">
            <Link href={`/demos/${id}/conversations`}>
              <Button variant="outline" size="sm">
                <MessageSquare className="w-4 h-4" /> Conversaciones
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              <Pencil className="w-4 h-4" /> Editar
            </Button>
            <Button
              variant={demo.status === "active" ? "secondary" : "primary"}
              size="sm"
              onClick={toggleStatus}
            >
              <Power className="w-4 h-4" />
              {demo.status === "active" ? "Desactivar" : "Activar"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos de la demo</h2>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-gray-500">Estado</dt><dd><StatusBadge status={demo.status} /></dd></div>
            <div><dt className="text-gray-500">Canal</dt><dd><StatusBadge status={demo.channel} /></dd></div>
            <div><dt className="text-gray-500">Proveedor</dt><dd className="capitalize">{demo.provider}</dd></div>
            <div>
              <dt className="text-gray-500">Webhook n8n</dt>
              <dd className="text-xs break-all text-gray-700">
                {demo.n8nWebhookUrl ? (
                  <span className="text-green-600 font-medium">Configurado ✓</span>
                ) : (
                  <span className="text-orange-500">No configurado</span>
                )}
              </dd>
            </div>
            {demo.expiresAt && (
              <div><dt className="text-gray-500">Expira</dt><dd>{formatDate(demo.expiresAt)}</dd></div>
            )}
            {demo.internalNotes && (
              <div><dt className="text-gray-500">Notas</dt><dd className="text-gray-600 text-xs">{demo.internalNotes}</dd></div>
            )}
          </dl>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Teléfonos autorizados ({testers.length})
            </h2>
            <Button size="sm" onClick={() => setShowAddTester(true)}>
              <Plus className="w-4 h-4" /> Agregar tester
            </Button>
          </div>

          {testers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">Sin testers autorizados. Agrega teléfonos para que puedan recibir mensajes.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Teléfono</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Creado</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {testers.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600">{t.phone}</span>
                        <span className="block text-xs text-gray-400">{t.normalizedPhone}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={t.role} /></td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.active ? "active" : "inactive"} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => toggleTester(t.id, t.active)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title={t.active ? "Desactivar" : "Activar"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditTester(t);
                              setTesterForm({ name: t.name, phone: t.phone, role: t.role });
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTester(t.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
        </div>
      </div>

      {/* Edit demo modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar demo" size="lg">
        <DemoForm
          initial={demo}
          onSaved={() => { setShowEdit(false); load(); }}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      {/* Add/edit tester modal */}
      <Modal
        open={showAddTester || !!editTester}
        onClose={() => { setShowAddTester(false); setEditTester(null); setTesterError(""); }}
        title={editTester ? "Editar tester" : "Agregar tester"}
      >
        <form onSubmit={saveTester} className="space-y-4">
          <Input
            label="Nombre *"
            value={testerForm.name}
            onChange={(e) => setTesterForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="Juan Pérez"
          />
          <Input
            label="Teléfono *"
            value={testerForm.phone}
            onChange={(e) => setTesterForm((f) => ({ ...f, phone: e.target.value }))}
            required
            placeholder="+57 320 340 6072"
            hint={`Se normalizará a: ${normalizePhone(testerForm.phone) || "—"}`}
          />
          <Select
            label="Rol"
            value={testerForm.role}
            onChange={(e) => setTesterForm((f) => ({ ...f, role: e.target.value }))}
            options={[
              { value: "tester", label: "Tester" },
              { value: "client", label: "Cliente" },
              { value: "internal", label: "Interno" },
            ]}
          />
          {testerError && <p className="text-sm text-red-600">{testerError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowAddTester(false); setEditTester(null); setTesterError(""); }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={savingTester}>
              {editTester ? "Guardar" : "Agregar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
