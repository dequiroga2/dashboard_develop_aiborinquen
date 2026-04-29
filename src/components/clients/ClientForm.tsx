"use client";
import { useState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Props {
  initial?: any;
  onSaved: () => void;
  onCancel: () => void;
}

export function ClientForm({ initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    companyName: initial?.companyName || "",
    contactName: initial?.contactName || "",
    contactPhone: initial?.contactPhone || "",
    contactEmail: initial?.contactEmail || "",
    notes: initial?.notes || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = initial ? `/api/clients/${initial.id}` : "/api/clients";
    const method = initial ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Error al guardar");
      return;
    }

    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre *"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        required
        placeholder="Dra. Sonia"
      />
      <Input
        label="Empresa"
        value={form.companyName}
        onChange={(e) => set("companyName", e.target.value)}
        placeholder="Clínica Dermatológica"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nombre de contacto"
          value={form.contactName}
          onChange={(e) => set("contactName", e.target.value)}
          placeholder="Juan Pérez"
        />
        <Input
          label="Teléfono"
          value={form.contactPhone}
          onChange={(e) => set("contactPhone", e.target.value)}
          placeholder="+57 300 123 4567"
        />
      </div>
      <Input
        label="Email"
        type="email"
        value={form.contactEmail}
        onChange={(e) => set("contactEmail", e.target.value)}
        placeholder="contacto@empresa.com"
      />
      <Textarea
        label="Notas internas"
        value={form.notes}
        onChange={(e) => set("notes", e.target.value)}
        placeholder="Observaciones..."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>{initial ? "Guardar cambios" : "Crear cliente"}</Button>
      </div>
    </form>
  );
}
