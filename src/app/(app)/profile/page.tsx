"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle, Eye, EyeOff, ExternalLink } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((u) => {
        setUser(u);
        setApiKey(u.n8nApiKey ?? "");
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n8nApiKey: apiKey || null }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!user) return <div className="text-gray-400 text-sm py-10 text-center">Cargando...</div>;

  return (
    <div>
      <Header title="Mi perfil" description="Configuración de tu cuenta y credenciales" />

      <div className="max-w-xl space-y-6">
        {/* Info de cuenta */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Información de cuenta</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nombre</dt>
              <dd className="font-medium text-gray-900">{user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-700">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Rol</dt>
              <dd className="capitalize text-gray-700">{user.role?.toLowerCase()}</dd>
            </div>
          </dl>
        </div>

        {/* n8n API Key */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">API Key de n8n</h2>
          <p className="text-xs text-gray-500 mb-4">
            Necesaria para que Demo Router cree automáticamente el workflow de n8n al crear una demo.{" "}
            <a
              href="https://aiborinquen.app.n8n.cloud/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Generar en n8n <ExternalLink className="w-3 h-3" />
            </a>
          </p>

          <form onSubmit={save} className="space-y-4">
            <div className="relative">
              <Input
                label="API Key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="eyJhbGci..."
                hint="Se guarda encriptada. Solo tú puedes verla."
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving}>
                Guardar
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" /> Guardado
                </span>
              )}
            </div>
          </form>

          {user.n8nApiKey && (
            <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> API Key configurada — los workflows se crean automáticamente
            </p>
          )}
          {!user.n8nApiKey && (
            <p className="text-xs text-orange-500 mt-3">
              Sin API Key — el campo webhook URL de tus demos deberá llenarse manualmente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
