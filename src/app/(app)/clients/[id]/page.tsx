"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { ArrowLeft, Bot, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { DemoForm } from "@/components/demos/DemoForm";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [showDemo, setShowDemo] = useState(false);

  async function load() {
    const res = await fetch(`/api/clients/${id}`);
    if (!res.ok) { router.push("/clients"); return; }
    setClient(await res.json());
  }

  useEffect(() => { load(); }, [id]);

  if (!client) return <div className="text-gray-400 text-sm py-10">Cargando...</div>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Volver a clientes
        </Link>
      </div>

      <Header
        title={client.name}
        description={client.companyName || ""}
        action={
          <Button onClick={() => setShowDemo(true)}>
            <Plus className="w-4 h-4" /> Nueva demo
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos del cliente</h2>
          <dl className="space-y-3 text-sm">
            {client.contactName && (
              <div><dt className="text-gray-500">Contacto</dt><dd className="font-medium">{client.contactName}</dd></div>
            )}
            {client.contactPhone && (
              <div><dt className="text-gray-500">Teléfono</dt><dd>{client.contactPhone}</dd></div>
            )}
            {client.contactEmail && (
              <div><dt className="text-gray-500">Email</dt><dd>{client.contactEmail}</dd></div>
            )}
            {client.notes && (
              <div><dt className="text-gray-500">Notas</dt><dd className="text-gray-700">{client.notes}</dd></div>
            )}
            <div><dt className="text-gray-500">Creado</dt><dd>{formatDate(client.createdAt)}</dd></div>
          </dl>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Demos ({client.demos?.length})</h2>
          {client.demos?.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Bot className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Sin demos aún.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {client.demos?.map((d: any) => (
                <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{d.name}</p>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {d.botName} · {d._count?.conversations || 0} conversaciones
                    </p>
                  </div>
                  <Link href={`/demos/${d.id}`}>
                    <Button variant="outline" size="sm">Ver demo</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={showDemo} onClose={() => setShowDemo(false)} title="Nueva demo" size="lg">
        <DemoForm
          initialClientId={id}
          onSaved={() => { setShowDemo(false); load(); }}
          onCancel={() => setShowDemo(false)}
        />
      </Modal>
    </div>
  );
}
