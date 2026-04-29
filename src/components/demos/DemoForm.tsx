"use client";
import { useEffect, useState } from "react";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
    provider: initial?.provider || "twilio",
    n8nWebhookUrl: initial?.n8nWebhookUrl || "",
    status: initial?.status || "inactive",
    allowPhoneReuse: initial?.allowPhoneReuse || false,
    expiresAt: initial?.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 10) : "",
    internalNotes: initial?.internalNotes || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(data));
  }, []);

  function set(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
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

    onSaved();
  }

  const clientOptions = [
    { value: "", label: "Selecciona un cliente" },
    ...clients.map((c) => ({ value: c.id, label: `${c.name}${c.companyName ? ` (${c.companyName})` : ""}` })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Cliente *"
        value={form.clientId}
        onChange={(e) => set("clientId", e.target.value)}
        options={clientOptions}
        required
      />
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
            { value: "twilio", label: "Twilio" },
            { value: "meta", label: "Meta" },
            { value: "ycloud", label: "YCloud" },
            { value: "other", label: "Otro" },
          ]}
        />
      </div>
      <Input
        label="n8n Webhook URL"
        type="url"
        value={form.n8nWebhookUrl}
        onChange={(e) => set("n8nWebhookUrl", e.target.value)}
        placeholder="https://n8n.tudominio.com/webhook/..."
        hint="URL del webhook de n8n que recibirá los mensajes"
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
