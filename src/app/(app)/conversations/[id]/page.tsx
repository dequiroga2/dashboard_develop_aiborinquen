"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Phone, Calendar, Globe, ExternalLink, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatTime } from "@/lib/utils";

const MEDIA_LABELS = ["🖼️ Imagen", "🎵 Audio", "🎬 Video", "😄 Sticker", "📄", "📍 Ubicación", "📎 Archivo"];

function isMediaLabel(content: string) {
  return MEDIA_LABELS.some((label) => content?.startsWith(label));
}

function MessageBubble({ msg }: { msg: any }) {
  const isOut = msg.direction === "outbound";
  const isMedia = isMediaLabel(msg.content);
  const isEmpty = !msg.content;
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
          isOut
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-900 rounded-bl-sm"
        }`}
      >
        {isEmpty ? (
          <p className={`text-sm italic ${isOut ? "text-blue-200" : "text-gray-400"}`}>
            (mensaje vacío)
          </p>
        ) : isMedia ? (
          <p className={`text-sm font-medium ${isOut ? "text-white" : "text-gray-700"}`}>
            {msg.content}
          </p>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        )}
        <p
          className={`text-xs mt-1 text-right ${
            isOut ? "text-blue-200" : "text-gray-400"
          }`}
        >
          {formatTime(msg.createdAt)}
          {msg.senderType === "bot" && " · Bot"}
          {msg.senderType === "system" && " · Sistema"}
        </p>
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [conv, setConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [status, setStatus] = useState("open");
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadConv() {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) { router.push("/conversations"); return; }
    const data = await res.json();
    setConv(data);
    setStatus(data.status);
  }

  async function loadMessages() {
    const res = await fetch(`/api/conversations/${id}/messages`);
    if (res.ok) setMessages(await res.json());
  }

  useEffect(() => {
    loadConv();
    loadMessages();
  }, [id]);

  // Polling for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMessages();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function clearHistory() {
    if (!confirm("¿Eliminar todo el historial de esta conversación? Esta acción no se puede deshacer.")) return;
    setClearing(true);
    const res = await fetch(`/api/conversations/${id}/messages`, { method: "DELETE" });
    if (res.ok) {
      setMessages([]);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Error al limpiar historial: ${err.error || res.status}`);
    }
    setClearing(false);
  }

  async function changeStatus(newStatus: string) {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatus(newStatus);
  }

  if (!conv) return <div className="text-gray-400 text-sm py-10 text-center">Cargando...</div>;

  const { demo, tester } = conv;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <Link href="/conversations" className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-gray-900">{tester?.name}</h1>
            <StatusBadge status={status} />
            <StatusBadge status={conv.channel} />
          </div>
          <p className="text-xs text-gray-500">
            {demo?.name} · {demo?.client?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === "open" && (
            <>
              <Button variant="outline" size="sm" onClick={() => changeStatus("closed")}>
                Cerrar
              </Button>
              <Button variant="danger" size="sm" onClick={() => changeStatus("blocked")}>
                Bloquear
              </Button>
            </>
          )}
          {status !== "open" && (
            <Button variant="outline" size="sm" onClick={() => changeStatus("open")}>
              Reabrir
            </Button>
          )}
          <Link href={`/conversations/${id}/logs`}>
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-4 h-4" /> Logs
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Message thread */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-10">Sin mensajes aún.</div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Metadata panel */}
        <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 p-5 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Conversación</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs">{formatDateTime(conv.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <StatusBadge status={conv.channel} />
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tester</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Nombre</dt>
                <dd className="font-medium text-gray-900">{tester?.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Teléfono</dt>
                <dd className="font-mono text-xs text-gray-700 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {conv.phone}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Rol</dt>
                <dd><StatusBadge status={tester?.role} /></dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Demo</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Nombre</dt>
                <dd className="font-medium text-gray-900">{demo?.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Bot</dt>
                <dd className="flex items-center gap-1">
                  <Bot className="w-3 h-3 text-gray-400" /> {demo?.botName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Cliente</dt>
                <dd>{demo?.client?.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Developer</dt>
                <dd>{demo?.user?.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Estado</dt>
                <dd><StatusBadge status={demo?.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Webhook</dt>
                <dd className="text-xs break-all text-gray-600">
                  {demo?.n8nWebhookUrl ? (
                    <span className="text-green-600 font-medium">Configurado</span>
                  ) : (
                    <span className="text-orange-500">No configurado</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <Link
              href={`/demos/${demo?.id}/conversations`}
              className="text-xs text-blue-600 hover:underline"
            >
              Ver todas las conversaciones →
            </Link>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={clearHistory}
              disabled={clearing}
              className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearing ? "Eliminando..." : "Limpiar historial"}
            </button>
            <p className="text-xs text-gray-400 mt-1">
              Borra los mensajes del dashboard y reinicia el contexto del bot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
