"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserCog, Plus, Pencil, Trash2, Power } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<UserForm>({ name: "", email: "", password: "", role: "DEVELOPER" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/users");
    setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ name: "", email: "", password: "", role: "DEVELOPER" });
    setFormError("");
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(user: any) {
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setFormError("");
    setEditing(user);
    setShowForm(true);
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    const body: any = { name: form.name, email: form.email, role: form.role };
    if (form.password) body.password = form.password;

    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const method = editing ? "PUT" : "POST";

    if (!editing && !form.password) {
      setFormError("La contraseña es requerida");
      setSaving(false);
      return;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setFormError(typeof data.error === "string" ? data.error : "Error al guardar");
      return;
    }

    setShowForm(false);
    setEditing(null);
    load();
  }

  async function toggleUser(user: any) {
    await fetch(`/api/users/${user.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    load();
  }

  async function deleteUser(userId: string) {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/users/${userId}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <Header
        title="Usuarios"
        description="Gestiona los accesos al sistema"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nuevo usuario
          </Button>
        }
      />

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : users.length === 0 ? (
        <EmptyState icon={UserCog} title="Sin usuarios" action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Crear usuario</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Clientes / Demos</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Creado</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={u.role} /></td>
                  <td className="px-6 py-4"><StatusBadge status={u.active ? "active" : "inactive"} /></td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {u._count?.clients} clientes · {u._count?.demos} demos
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatDate(u.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => toggleUser(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
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
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Editar usuario" : "Nuevo usuario"}
      >
        <form onSubmit={saveUser} className="space-y-4">
          <Input label="Nombre *" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          <Input label="Email *" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          <Input
            label={editing ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required={!editing}
            placeholder="Mínimo 6 caracteres"
          />
          <Select
            label="Rol"
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            options={[
              { value: "DEVELOPER", label: "Developer" },
              { value: "ADMIN", label: "Admin" },
            ]}
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
