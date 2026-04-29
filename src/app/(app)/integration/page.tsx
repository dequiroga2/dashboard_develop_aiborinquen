"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Copy, Check } from "lucide-react";

const inboundExample = {
  from: "+57 320 340 6072",
  text: "Hola, quiero información",
  channel: "whatsapp",
  provider: "twilio",
};

const n8nReceivesExample = {
  demo_id: "clx1234abc",
  client_id: "clx5678def",
  client_name: "Dra. Sonia",
  demo_name: "Bot Dermatología WhatsApp",
  bot_name: "SoniaBot",
  developer: { id: "clxdev001", name: "David Quiroga", email: "dev@demo-router.local" },
  tester: { id: "clxtester01", name: "David Quiroga", phone: "+57 320 340 6072", role: "tester" },
  conversation: { id: "clxconv001", channel: "whatsapp", status: "open" },
  message: { text: "Hola, quiero información", direction: "inbound", timestamp: "2026-04-28T10:30:00.000Z" },
  metadata: { provider: "twilio", raw_payload: {} },
};

const n8nResponseExample = { reply: "¡Hola! Soy SoniaBot. ¿En qué te puedo ayudar?" };

function CopyBlock({ code, language = "json" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute top-3 right-3 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
        title="Copiar"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="bg-gray-900 text-green-400 rounded-xl p-5 text-xs overflow-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

export default function IntegrationPage() {
  const endpoint = `${typeof window !== "undefined" ? window.location.origin : "https://tu-dominio.com"}/api/webhooks/inbound`;

  return (
    <div>
      <Header title="Configuración de integración" description="Cómo conectar tu chatbot de n8n al Demo Router" />

      <div className="space-y-8 max-w-3xl">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">Endpoint público de webhook</h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-white border border-blue-200 rounded-lg px-4 py-2.5 text-sm font-mono text-blue-800 break-all">
              POST {endpoint}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(endpoint)}
            >
              <Copy className="w-4 h-4" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Configura este endpoint en tu proveedor (Twilio, Meta, etc.) como webhook de entrada.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Pasos para conectar un chatbot</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 ml-1">
            <li>Crea una demo en la sección <strong>Demos</strong></li>
            <li>Pega la URL de tu webhook de n8n en el campo <em>n8n Webhook URL</em></li>
            <li>Agrega teléfonos autorizados en la sección de testers</li>
            <li>Activa la demo</li>
            <li>Escribe al número único desde un teléfono autorizado</li>
            <li>Revisa conversaciones y logs aquí</li>
          </ol>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Ejemplo de payload entrante (genérico)
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Puedes enviar este JSON directamente al endpoint para pruebas (con curl o Postman):
          </p>
          <CopyBlock code={JSON.stringify(inboundExample, null, 2)} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Payload que n8n recibirá
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            El sistema transforma el mensaje entrante y envía este payload a tu webhook de n8n:
          </p>
          <CopyBlock code={JSON.stringify(n8nReceivesExample, null, 2)} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Respuesta esperada desde n8n
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Tu flujo de n8n debe responder con este JSON. El campo <code className="bg-gray-100 px-1 rounded">reply</code> es el texto que recibirá el usuario:
          </p>
          <CopyBlock code={JSON.stringify(n8nResponseExample, null, 2)} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Prueba con curl</h2>
          <CopyBlock
            language="bash"
            code={`curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "+573203406072",
    "text": "Hola, quiero información",
    "channel": "whatsapp",
    "provider": "other"
  }'`}
          />
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Seguridad (opcional)</h2>
          <p className="text-sm text-gray-600">
            Si defines <code className="bg-gray-100 px-1 rounded">WEBHOOK_SECRET</code> en el entorno,
            deberás incluir el header <code className="bg-gray-100 px-1 rounded">x-demo-router-secret</code>
            con ese valor en cada request entrante.
          </p>
        </div>
      </div>
    </div>
  );
}
