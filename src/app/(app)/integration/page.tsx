"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Copy, Check } from "lucide-react";

const n8nPayloadExample = {
  demo_id: "cmojczaqv0003h7oqkapkejqo",
  client_id: "cmojcxa410001h7oq9yswmvdn",
  client_name: "Daniel",
  demo_name: "Bot Vagon",
  bot_name: "Vagon bot",
  developer: { id: "cmojc3s770000qq64lo6aqtxu", name: "Juan David", email: "juanda@gmail.com" },
  tester: { id: "cmojd2wq90005h7oqq9s3dk5c", name: "Cliente Demo", phone: "+573203406072", role: "tester" },
  conversation: { id: "cmojdg2e10007h7oq1kprqj99", channel: "whatsapp", status: "open" },
  message: {
    text: "Hola, quiero información",
    type: "text",
    direction: "inbound",
    timestamp: "2026-04-29T04:59:56.196Z",
    media: null,
  },
  metadata: {
    provider: "meta",
    raw_payload: { "...": "payload completo de Meta WhatsApp API" },
  },
};

const n8nPayloadMediaExample = {
  "...campos anteriores": "igual",
  message: {
    text: "",
    type: "image",
    direction: "inbound",
    timestamp: "2026-04-29T05:00:00.000Z",
    media: { id: "1234567890", mimeType: "image/jpeg", sha256: "abc123", filename: null },
  },
};

const n8nResponseSync = { reply: "¡Hola! Soy el asistente virtual. ¿En qué te puedo ayudar?" };
const n8nResponseAsync = { async: true };

const saveOutboundExample = {
  content: "¡Hola! Soy el asistente virtual. ¿En qué te puedo ayudar?",
  direction: "outbound",
  senderType: "bot",
};

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
        className="absolute top-3 right-3 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors z-10"
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

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
      {sub && <p className="text-sm text-gray-500 mb-3">{sub}</p>}
      {children}
    </div>
  );
}

function NodeCard({ icon, title, description, nodes }: { icon: string; title: string; description: string; nodes: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-semibold text-sm text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {nodes.map((n) => (
          <span key={n} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{n}</span>
        ))}
      </div>
    </div>
  );
}

export default function IntegrationPage() {
  const endpoint = `${typeof window !== "undefined" ? window.location.origin : "https://tu-dominio.com"}/api/webhooks/inbound`;

  return (
    <div>
      <Header title="Integración con n8n" description="Guía completa para conectar tu workflow al Demo Router" />

      <div className="space-y-10 max-w-3xl">

        {/* Endpoint */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">Webhook de entrada (Meta → Demo Router)</h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-white border border-blue-200 rounded-lg px-4 py-2.5 text-sm font-mono text-blue-800 break-all">
              POST {endpoint}
            </code>
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(endpoint)}>
              <Copy className="w-4 h-4" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Este endpoint lo configuras en Meta → WhatsApp → Webhooks. Demo Router recibe el mensaje, identifica la demo y lo reenvía a n8n.
          </p>
        </div>

        {/* Payload a n8n */}
        <Section
          title="Payload que recibe tu webhook de n8n"
          sub="Demo Router transforma el mensaje de Meta y envía este JSON a la URL del webhook configurado en tu demo:"
        >
          <CopyBlock code={JSON.stringify(n8nPayloadExample, null, 2)} />
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-1">Para mensajes con media (imagen, audio, documento):</p>
            <p className="text-xs text-amber-700 mb-2">El campo <code className="bg-amber-100 px-1 rounded">message.text</code> viene vacío y <code className="bg-amber-100 px-1 rounded">message.media</code> trae el ID del archivo en Meta:</p>
            <CopyBlock code={JSON.stringify(n8nPayloadMediaExample, null, 2)} />
          </div>
        </Section>

        {/* Nodos recomendados */}
        <Section title="Nodos recomendados por tipo de mensaje">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NodeCard
              icon="💬"
              title="Texto"
              description="El mensaje llega en message.text — úsalo directo como chat_input del agente."
              nodes={["Code (normalizar)", "AI Agent", "HTTP Request (Meta)"]}
            />
            <NodeCard
              icon="🎵"
              title="Audio (voz)"
              description="Descarga el archivo de Meta con su token, luego transcribe con Whisper."
              nodes={["HTTP Request (URL)", "HTTP Request (download)", "OpenAI Transcribe", "AI Agent"]}
            />
            <NodeCard
              icon="🖼️"
              title="Imagen"
              description="Descarga la imagen de Meta y analízala con visión de GPT-4o."
              nodes={["HTTP Request (URL)", "HTTP Request (download)", "OpenAI Analyze Image", "AI Agent"]}
            />
            <NodeCard
              icon="📄"
              title="Documento / PDF"
              description="Descarga el PDF de Meta, extrae el texto y envíalo al agente."
              nodes={["HTTP Request (URL)", "HTTP Request (download)", "Extract from File", "AI Agent"]}
            />
            <NodeCard
              icon="🤖"
              title="Respuesta del agente"
              description="El agente devuelve JSON estructurado. Separa texto e imágenes para enviar a Meta."
              nodes={["AI Agent", "Structured Output Parser", "Split Out (imágenes)", "HTTP Request (Meta)"]}
            />
            <NodeCard
              icon="🔄"
              title="Buffer / Debounce"
              description="Agrupa mensajes rápidos del mismo usuario antes de enviar al agente."
              nodes={["Redis Push", "Redis Get", "Switch (wait/process)", "Wait (10s)"]}
            />
          </div>
        </Section>

        {/* Respuesta a Demo Router */}
        <Section title="Respuesta que espera Demo Router desde n8n">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Opción A — Respuesta síncrona (Demo Router envía a Meta)</p>
              <p className="text-xs text-gray-500 mb-2">Si tu n8n responde antes del timeout (25 seg), Demo Router envía el <code className="bg-gray-100 px-1 rounded">reply</code> directamente a Meta.</p>
              <CopyBlock code={JSON.stringify(n8nResponseSync, null, 2)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Opción B — Modo asíncrono (recomendado con agentes IA)</p>
              <p className="text-xs text-gray-500 mb-2">Tu n8n responde de inmediato con <code className="bg-gray-100 px-1 rounded">{`{"async":true}`}</code> y luego envía el mensaje a Meta directamente usando el Graph API. Es más confiable para respuestas largas.</p>
              <CopyBlock code={JSON.stringify(n8nResponseAsync, null, 2)} />
            </div>
          </div>
        </Section>

        {/* Guardar mensaje saliente */}
        <Section
          title="Guardar mensaje del bot en el dashboard"
          sub="Cuando usas modo asíncrono, n8n envía a Meta directamente. Para que el mensaje aparezca en el dashboard, llama este endpoint:"
        >
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
            <code className="text-sm font-mono text-gray-800">
              POST /api/conversations/<span className="text-blue-600">{"{{conversation_id}}"}</span>/messages
            </code>
            <p className="text-xs text-gray-500 mt-1">
              Donde <code className="bg-gray-100 px-1 rounded">conversation_id</code> es <code className="bg-gray-100 px-1 rounded">{"$('Code in JavaScript').item.json.conversation_id"}</code> en n8n.
            </p>
          </div>
          <CopyBlock code={JSON.stringify(saveOutboundExample, null, 2)} />
        </Section>

        {/* Prueba con curl */}
        <Section title="Prueba rápida con curl">
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
        </Section>

        {/* Seguridad */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Seguridad (opcional)</h2>
          <p className="text-sm text-gray-600">
            Si defines <code className="bg-gray-100 px-1 rounded">WEBHOOK_SECRET</code> en el entorno,
            incluye el header <code className="bg-gray-100 px-1 rounded">x-demo-router-secret</code> en cada request entrante.
          </p>
        </div>
      </div>
    </div>
  );
}
