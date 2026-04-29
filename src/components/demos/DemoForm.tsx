"use client";
import { useEffect, useState } from "react";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, X } from "lucide-react";

interface Props {
  initial?: any;
  initialClientId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function DemoForm({ initial, initialClientId, onSaved, onCancel }: Props) {
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({
    clientId: initial?.clientId || initialClientId || "",
    name: initial?.name || "",
    botName: initial?.botName || "",
    channel: initial?.channel || "whatsapp",
    provider: initial?.provider || "meta",
    n8nWebhookUrl: initial?.n8nWebhookUrl || "",
    status: initial?.status || "inactive",
    allowPhoneReuse: initial?.allowPhoneReuse || false,
    expiresAt: initial?.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 10) : "",
    internalNotes: initial?.internalNotes || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Inline client creation state
  const [showNewClient, setShowNewClient] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", companyName: "" });
  const [savingClient, setSavingClient] = useState(false);
  const [clientError, setClientError] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const data = await fetch("/api/clients").then((r) => r.json());
    setClients(data);
  }

  function set(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function createClient() {
    if (!clientForm.name.trim()) { setClientError("El nombre es requerido"); return; }
    setSavingClient(true);
    setClientError("");
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clientForm.name.trim(), companyName: clientForm.companyName.trim() || undefined }),
    });
    setSavingClient(false);
    if (!res.ok) {
      const d = await res.json();
      setClientError(typeof d.error === "string" ? d.error : "Error al crear cliente");
      return;
    }
    const newClient = await res.json();
    await loadClients();
    set("clientId", newClient.id);
    setShowNewClient(false);
    setClientForm({ name: "", companyName: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = initial ? `/api/demos/${initial.id}` : "/api/demos";
    const method = initial ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        expiresAt: form.expiresAt || null,
        n8nWebhookUrl: form.n8nWebhookUrl || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Error al guardar");
      return;
    }

    const result = await res.json();
    if (result.workflowError) {
      setError(`Demo creada, pero el workflow de n8n falló: ${result.workflowError}`);
      // Still call onSaved since the demo was created
      setTimeout(onSaved, 3000);
      return;
    }

    onSaved();
  }

  const clientOptions = [
    { value: "", label: "Selecciona un cliente" },
    ...clients.map((c) => ({ value: c.id, label: `${c.name}${c.companyName ? ` (${c.companyName})` : ""}` })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Client selector + inline create */}
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label="Cliente *"
              value={form.clientId}
              onChange={(e) => set("clientId", e.target.value)}
              options={clientOptions}
              required
            />
          </div>
          {!initial && (
            <button
              type="button"
              onClick={() => { setShowNewClient(!showNewClient); setClientError(""); }}
              className="mb-0.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
            >
              {showNewClient ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showNewClient ? "Cancelar" : "Nuevo cliente"}
            </button>
          )}
        </div>

        {showNewClient && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-800">Crear cliente rápido</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre *"
                value={clientForm.name}
                onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="David Corp"
                required
              />
              <Input
                label="Empresa (opcional)"
                value={clientForm.companyName}
                onChange={(e) => setClientForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="David Corp S.A.S"
              />
            </div>
            {clientError && <p className="text-xs text-red-600">{clientError}</p>}
            <Button type="button" size="sm" loading={savingClient} onClick={createClient}>
              Crear y seleccionar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nombre de la demo *"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
          placeholder="Bot Dermatología WhatsApp"
        />
        <Input
          label="Nombre del bot *"
          value={form.botName}
          onChange={(e) => set("botName", e.target.value)}
          required
          placeholder="SoniaBot"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Canal"
          value={form.channel}
          onChange={(e) => set("channel", e.target.value)}
          options={[
            { value: "whatsapp", label: "WhatsApp" },
            { value: "sms", label: "SMS" },
            { value: "both", label: "WhatsApp + SMS" },
          ]}
        />
        <Select
          label="Proveedor"
          value={form.provider}
          onChange={(e) => set("provider", e.target.value)}
          options={[
            { value: "meta", label: "Meta" },
          ]}
        />
      </div>
      <Input
        label="n8n Webhook URL"
        type="url"
        value={form.n8nWebhookUrl}
        onChange={(e) => set("n8nWebhookUrl", e.target.value)}
        placeholder="Se genera automáticamente si tienes API key configurada"
        hint="Déjalo vacío para auto-generar el workflow. Solo llénalo si quieres apuntar a un workflow existente."
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Estado"
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
          options={[
            { value: "inactive", label: "Inactiva" },
            { value: "active", label: "Activa" },
          ]}
        />
        <Input
          label="Expira el (opcional)"
          type="date"
          value={form.expiresAt}
          onChange={(e) => set("expiresAt", e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.allowPhoneReuse}
          onChange={(e) => set("allowPhoneReuse", e.target.checked)}
          className="rounded border-gray-300 text-blue-600"
        />
        <span className="text-sm text-gray-700">Permitir reutilización de teléfonos entre demos</span>
      </label>
      <Textarea
        label="Notas internas"
        value={form.internalNotes}
        onChange={(e) => set("internalNotes", e.target.value)}
        placeholder="Observaciones técnicas..."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>{initial ? "Guardar cambios" : "Crear demo"}</Button>
      </div>
    </form>
  );
}
