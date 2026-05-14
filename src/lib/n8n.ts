/**
 * n8n API integration — auto-create workflow when a demo is created.
 * Each developer configures their own n8n API key in their profile.
 */

export interface CreateWorkflowParams {
  clientSlug: string;       // normalized: "daniel" → path "daniel-chatbot"
  demoName: string;
  n8nApiKey: string;
  n8nBaseUrl: string;       // e.g. "https://aiborinquen.app.n8n.cloud"
  demoRouterUrl: string;    // e.g. "https://dashboard-develop-aiborinquen.vercel.app"
  metaToken: string;
  metaPhoneNumberId: string;
}

export interface CreateWorkflowResult {
  workflowId: string;
  webhookUrl: string;
}

/** Normalize a client name to a URL-safe slug: "Daniel Corp" → "daniel-corp" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createN8nWorkflow(
  params: CreateWorkflowParams
): Promise<CreateWorkflowResult | null> {
  const { clientSlug, demoName, n8nApiKey, n8nBaseUrl, demoRouterUrl, metaToken, metaPhoneNumberId } = params;
  const webhookPath = `${clientSlug}-chatbot`;
  const base = n8nBaseUrl.replace(/\/$/, "");

  const workflow = buildWorkflowTemplate({ webhookPath, demoName, demoRouterUrl, metaToken, metaPhoneNumberId });

  try {
    // Create the workflow
    const createRes = await fetch(`${base}/api/v1/workflows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": n8nApiKey,
      },
      body: JSON.stringify(workflow),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error("n8n create workflow error:", createRes.status, err);
      throw new Error(`n8n ${createRes.status}: ${err}`);
    }

    const created = await createRes.json();
    const workflowId: string = created.id;

    // Activate the workflow so the production webhook is live
    await fetch(`${base}/api/v1/workflows/${workflowId}/activate`, {
      method: "POST",
      headers: { "X-N8N-API-KEY": n8nApiKey },
    });

    return {
      workflowId,
      webhookUrl: `${base}/webhook/${webhookPath}`,
    };
  } catch (err) {
    console.error("n8n create workflow exception:", err);
    throw err;
  }
}

function buildWorkflowTemplate(p: {
  webhookPath: string;
  demoName: string;
  demoRouterUrl: string;
  metaToken: string;
  metaPhoneNumberId: string;
}) {
  const { webhookPath, demoName, demoRouterUrl, metaToken, metaPhoneNumberId } = p;
  const metaMessagesUrl = `https://graph.facebook.com/v20.0/${metaPhoneNumberId}/messages`;
  const metaMediaUrl = `https://graph.facebook.com/v20.0/${metaPhoneNumberId}/media`;
  const authHeader = `Bearer ${metaToken}`;

  return {
    name: demoName,
    nodes: [
      /* ── 1. Webhook ── */
      {
        parameters: {
          httpMethod: "POST",
          path: webhookPath,
          responseMode: "responseNode",
          options: {},
        },
        type: "n8n-nodes-base.webhook",
        typeVersion: 2.1,
        position: [2624, 1168],
        id: "11111111-0001-0001-0001-000000000001",
        name: "Webhook",
        webhookId: crypto.randomUUID(),
      },

      /* ── 2. Code in JavaScript (normalizar payload Demo Router) ── */
      {
        parameters: {
          jsCode: `const payload = $json.body;

const fromRaw = payload.tester?.phone || "";
const fromE164 = fromRaw.startsWith("+") ? fromRaw : "+" + fromRaw.replace(/\\D/g, "");
const fromNormalized = fromE164.replace(/\\D/g, "");

const body        = payload.message?.text  || "";
const type        = payload.message?.type  || "text";
const media       = payload.message?.media || null;
const conversation_id = payload.conversation?.id || "";
const ts          = payload.message?.timestamp || new Date().toISOString();
const mensaje_id  = conversation_id + "_" + Date.now();

return [{
  fromE164,
  fromNormalized,
  body,
  type,
  media,
  conversation_id,
  ts,
  mensaje_id,
  raw: payload
}];`,
        },
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [2816, 1168],
        id: "11111111-0002-0002-0002-000000000002",
        name: "Code in JavaScript",
      },

      /* ── 3. Edit Fields (extraer type/id/time/data) ── */
      {
        parameters: {
          assignments: {
            assignments: [
              { id: "a1", name: "type", value: "={{ $json.type }}", type: "string" },
              { id: "a2", name: "id", value: "={{ $json.conversation_id }}", type: "string" },
              { id: "a3", name: "time", value: "={{ $json.ts }}", type: "string" },
              { id: "a4", name: "data", value: "={{ $json.raw }}", type: "object" },
            ],
          },
          options: {},
        },
        type: "n8n-nodes-base.set",
        typeVersion: 3.4,
        position: [3024, 1168],
        id: "11111111-0003-0003-0003-000000000003",
        name: "Edit Fields",
      },

      /* ── 4. Normalizador (clasificar tipo de media) ── */
      {
        parameters: {
          jsCode: `const type  = $json.type || 'text';
const raw   = $json.data || {};
const media = raw.message?.media || null;

const fromRaw = raw.tester?.phone || "";
const fromE164 = fromRaw.startsWith("+") ? fromRaw : "+" + fromRaw.replace(/\\D/g, "");

let kind = 'text';
if      (type === 'audio')                           kind = 'audio';
else if (type === 'image' || type === 'sticker')     kind = 'image';
else if (type === 'video')                           kind = 'video';
else if (type === 'document') {
  const mime = media?.mimeType || '';
  kind = mime === 'application/pdf' ? 'pdf' : 'document';
}

return [{
  kind,
  rawType:  type,
  mediaId:  media?.id       || null,
  mimeType: media?.mimeType || null,
  filename: media?.filename || null,
  text:     raw.message?.text || '',
  fromE164,
  conversation_id: raw.conversation?.id || '',
  mensaje_id: $json.id,
  ts:         $json.time,
}];`,
        },
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [3200, 1168],
        id: "11111111-0004-0004-0004-000000000004",
        name: "Normalizador",
      },

      /* ── 5. If2 (¿es texto?) ── */
      {
        parameters: {
          conditions: {
            options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
            conditions: [{
              id: "b1",
              leftValue: "={{ $json.kind }}",
              rightValue: "text",
              operator: { type: "string", operation: "equals" },
            }],
            combinator: "and",
          },
          options: {},
        },
        type: "n8n-nodes-base.if",
        typeVersion: 2.3,
        position: [3360, 1168],
        id: "11111111-0005-0005-0005-000000000005",
        name: "If2",
      },

      /* ── 6. HTTP Request2 (obtener URL del media de Meta) ── */
      {
        parameters: {
          url: "=https://graph.facebook.com/v20.0/{{ $('Normalizador').item.json.mediaId }}",
          sendHeaders: true,
          headerParameters: { parameters: [{ name: "Authorization", value: authHeader }] },
          options: {},
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.3,
        position: [3568, 1168],
        id: "11111111-0006-0006-0006-000000000006",
        name: "HTTP Request2",
      },

      /* ── 7. Switch (audio / imagen / pdf) ── */
      {
        parameters: {
          rules: {
            values: [
              {
                conditions: {
                  options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
                  conditions: [{ leftValue: "={{ $('If2').item.json.kind }}", rightValue: "audio", operator: { type: "string", operation: "equals" }, id: "c1" }],
                  combinator: "and",
                },
                renameOutput: true, outputKey: "Audio",
              },
              {
                conditions: {
                  options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
                  conditions: [{ id: "c2", leftValue: "={{ $('If2').item.json.kind }}", rightValue: "image", operator: { type: "string", operation: "equals" } }],
                  combinator: "and",
                },
                renameOutput: true, outputKey: "Imagen",
              },
              {
                conditions: {
                  options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
                  conditions: [{ id: "c3", leftValue: "={{ $('If2').item.json.kind }}", rightValue: "pdf", operator: { type: "string", operation: "equals" } }],
                  combinator: "and",
                },
                renameOutput: true, outputKey: "PDF",
              },
            ],
          },
          options: {},
        },
        type: "n8n-nodes-base.switch",
        typeVersion: 3.4,
        position: [3776, 1152],
        id: "11111111-0007-0007-0007-000000000007",
        name: "Switch",
      },

      /* ── 8. HTTP Request13 (descargar audio) ── */
      {
        parameters: {
          url: "={{ $json.url }}",
          sendHeaders: true,
          headerParameters: { parameters: [{ name: "Authorization", value: authHeader }] },
          options: { allowUnauthorizedCerts: true, response: { response: { responseFormat: "file", outputPropertyName: "file" } } },
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.3,
        position: [4080, 1008],
        id: "11111111-0008-0008-0008-000000000008",
        name: "HTTP Request13",
      },

      /* ── 9. Transcribe a recording ── */
      {
        parameters: { resource: "audio", operation: "transcribe", binaryPropertyName: "file", options: {} },
        type: "@n8n/n8n-nodes-langchain.openAi",
        typeVersion: 2.1,
        position: [4288, 1008],
        id: "11111111-0009-0009-0009-000000000009",
        name: "Transcribe a recording",
        credentials: { openAiApi: { id: "sltQuLh27VHE6KFm", name: "VAPI AI" } },
      },

      /* ── 10. Edit Fields2 (texto del audio) ── */
      {
        parameters: {
          assignments: { assignments: [{ id: "d1", name: "text", value: "={{ $json.text }}", type: "string" }] },
          options: {},
        },
        type: "n8n-nodes-base.set",
        typeVersion: 3.4,
        position: [4496, 1008],
        id: "11111111-0010-0010-0010-000000000010",
        name: "Edit Fields2",
      },

      /* ── 11. HTTP Request8 (descargar imagen) ── */
      {
        parameters: {
          url: "={{ $json.url }}",
          sendHeaders: true,
          headerParameters: { parameters: [{ name: "Authorization", value: authHeader }] },
          options: { allowUnauthorizedCerts: true, response: { response: { responseFormat: "file", outputPropertyName: "file" } } },
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.3,
        position: [4080, 1168],
        id: "11111111-0011-0011-0011-000000000011",
        name: "HTTP Request8",
      },

      /* ── 12. Analyze image ── */
      {
        parameters: {
          resource: "image",
          operation: "analyze",
          modelId: { __rl: true, value: "gpt-4o", mode: "list", cachedResultName: "GPT-4O" },
          text: "Analiza la imagen",
          inputType: "base64",
          binaryPropertyName: "file",
          options: {},
        },
        type: "@n8n/n8n-nodes-langchain.openAi",
        typeVersion: 2.1,
        position: [4288, 1168],
        id: "11111111-0012-0012-0012-000000000012",
        name: "Analyze image",
        credentials: { openAiApi: { id: "sltQuLh27VHE6KFm", name: "VAPI AI" } },
      },

      /* ── 13. Edit Fields3 (texto del análisis de imagen) ── */
      {
        parameters: {
          assignments: { assignments: [{ id: "e1", name: "text", value: "={{ $json['0'].content[0].text }}", type: "string" }] },
          options: {},
        },
        type: "n8n-nodes-base.set",
        typeVersion: 3.4,
        position: [4496, 1168],
        id: "11111111-0013-0013-0013-000000000013",
        name: "Edit Fields3",
      },

      /* ── 14. HTTP Request14 (descargar documento) ── */
      {
        parameters: {
          url: "={{ $json.url }}",
          sendHeaders: true,
          headerParameters: { parameters: [{ name: "Authorization", value: authHeader }] },
          options: { allowUnauthorizedCerts: true, response: { response: { responseFormat: "file", outputPropertyName: "file" } } },
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.3,
        position: [4080, 1328],
        id: "11111111-0014-0014-0014-000000000014",
        name: "HTTP Request14",
      },

      /* ── 15. Extract from File (PDF) ── */
      {
        parameters: { operation: "pdf", binaryPropertyName: "file", options: {} },
        type: "n8n-nodes-base.extractFromFile",
        typeVersion: 1.1,
        position: [4288, 1328],
        id: "11111111-0015-0015-0015-000000000015",
        name: "Extract from File",
      },

      /* ── 16. Edit Fields4 (texto del documento) ── */
      {
        parameters: {
          assignments: { assignments: [{ id: "f1", name: "text", value: "={{ $json.text }}", type: "string" }] },
          options: {},
        },
        type: "n8n-nodes-base.set",
        typeVersion: 3.4,
        position: [4496, 1328],
        id: "11111111-0016-0016-0016-000000000016",
        name: "Edit Fields4",
      },

      /* ── 17. Edit Fields5 (chat_input final) ── */
      {
        parameters: {
          assignments: { assignments: [{ id: "g1", name: "chat_input", value: "={{ $json.text }}", type: "string" }] },
          options: {},
        },
        type: "n8n-nodes-base.set",
        typeVersion: 3.4,
        position: [4800, 1168],
        id: "11111111-0017-0017-0017-000000000017",
        name: "Edit Fields5",
      },

      /* ── 18. Respond to Webhook1 (async: true) ── */
      {
        parameters: {
          respondWith: "json",
          responseBody: '={{ { "async": true } }}',
          options: {},
        },
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.5,
        position: [5184, 1008],
        id: "11111111-0018-0018-0018-000000000018",
        name: "Respond to Webhook1",
      },

      /* ── 19. Dynasty (Redis push) ── */
      {
        parameters: {
          operation: "push",
          list: "={{ $('Edit Fields').item.json.id }}",
          messageData: "={{ JSON.stringify({\"mensaje_id\": $('Code in JavaScript').item.json.mensaje_id,\"mensaje\": $json.chat_input,\"time\": $('Code in JavaScript').item.json.ts,\"id\": $('Edit Fields').item.json.id}) }}",
          tail: true,
        },
        type: "n8n-nodes-base.redis",
        typeVersion: 1,
        position: [5184, 1168],
        id: "11111111-0019-0019-0019-000000000019",
        name: "Dynasty",
        credentials: { redis: { id: "SCex3AvFTXVEB1cg", name: "Redis account" } },
      },

      /* ── 20. Redis (get buffer) ── */
      {
        parameters: {
          operation: "get",
          propertyName: "mensajes",
          key: "={{ $('Edit Fields').item.json.id }}",
          options: {},
        },
        type: "n8n-nodes-base.redis",
        typeVersion: 1,
        position: [5360, 1168],
        id: "11111111-0020-0020-0020-000000000020",
        name: "Redis",
        credentials: { redis: { id: "SCex3AvFTXVEB1cg", name: "Redis account" } },
      },

      /* ── 21. Switch1 (debounce: NADA / SEGUIR / WAIT) ── */
      {
        parameters: {
          rules: {
            values: [
              {
                conditions: {
                  options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
                  conditions: [{ leftValue: "={{ JSON.parse($json.mensajes.last()).mensaje_id }}", rightValue: "={{ $('Code in JavaScript').item.json.mensaje_id }}", operator: { type: "string", operation: "notEquals" }, id: "h1" }],
                  combinator: "and",
                },
                renameOutput: true, outputKey: "NADA",
              },
              {
                conditions: {
                  options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
                  conditions: [{ id: "h2", leftValue: "={{ JSON.parse($json.mensajes.last()).time }}", rightValue: "={{ $now.minus(10,\"seconds\") }}", operator: { type: "dateTime", operation: "before" } }],
                  combinator: "and",
                },
                renameOutput: true, outputKey: "SEGUIR",
              },
            ],
          },
          options: { fallbackOutput: "extra", renameFallbackOutput: "WAIT" },
        },
        type: "n8n-nodes-base.switch",
        typeVersion: 3.4,
        position: [5568, 1152],
        id: "11111111-0021-0021-0021-000000000021",
        name: "Switch1",
      },

      /* ── 22. Wait1 ── */
      {
        parameters: { amount: 10 },
        type: "n8n-nodes-base.wait",
        typeVersion: 1.1,
        position: [5776, 1264],
        id: "11111111-0022-0022-0022-000000000022",
        name: "Wait1",
        webhookId: crypto.randomUUID(),
      },

      /* ── 23. Redis1 (delete key) ── */
      {
        parameters: { operation: "delete", key: "={{ $('Edit Fields').item.json.id }}" },
        type: "n8n-nodes-base.redis",
        typeVersion: 1,
        position: [5904, 1168],
        id: "11111111-0023-0023-0023-000000000023",
        name: "Redis1",
        credentials: { redis: { id: "SCex3AvFTXVEB1cg", name: "Redis account" } },
      },

      /* ── 24. Edit Fields7 (unir mensajes del buffer) ── */
      {
        parameters: {
          assignments: { assignments: [{ id: "i1", name: "mensaje", value: "={{ $json.mensajes.map(m => JSON.parse(m).mensaje).join(\" \") }}", type: "string" }] },
          options: {},
        },
        type: "n8n-nodes-base.set",
        typeVersion: 3.4,
        position: [6112, 1168],
        id: "11111111-0024-0024-0024-000000000024",
        name: "Edit Fields7",
      },

      /* ── 25. AI Agent (sin prompt, sin tools) ── */
      {
        parameters: {
          promptType: "define",
          text: "={{ $json.mensaje }}",
          hasOutputParser: true,
          options: {
            systemMessage: `### Reglas de formato
Tu respuesta debe ser un JSON con la siguiente estructura:
{
  "mensaje": "Texto general de atencion al cliente SIN URL NI ARCHIVOS",
  "archivos": [
    {
      "url": "ID del archivo",
      "descripcion": "Descripción breve y simplificada del archivo basada en la descripción del archivo en Google Drive"
    }
  ]
}

Responde ÚNICAMENTE en formato JSON. No incluyas explicaciones, introducciones ni bloques de código markdown (\`\`\`json). Tu respuesta debe empezar con '{' y terminar con '}'.

MUY IMPORTANTE, en el "mensaje" nunca debes incluir links ni urls, NUNCA. Solo debe haber texto`,
          },
        },
        type: "@n8n/n8n-nodes-langchain.agent",
        typeVersion: 3,
        position: [6320, 1168],
        id: "11111111-0025-0025-0025-000000000025",
        name: "AI Agent",
        alwaysOutputData: true,
        retryOnFail: true,
        onError: "continueErrorOutput",
      },

      /* ── 26. OpenAI Chat Model (agente principal) ── */
      {
        parameters: {
          model: { __rl: true, value: "gpt-4o-mini", mode: "list", cachedResultName: "gpt-4o-mini" },
          options: {},
        },
        type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
        typeVersion: 1.2,
        position: [6192, 1488],
        id: "11111111-0026-0026-0026-000000000026",
        name: "OpenAI Chat Model",
        credentials: { openAiApi: { id: "sltQuLh27VHE6KFm", name: "VAPI AI" } },
      },

      /* ── 27. Postgres Chat Memory ── */
      {
        parameters: {
          sessionIdType: "customKey",
          sessionKey: "={{ $('Code in JavaScript').item.json.conversation_id }}",
          contextWindowLength: 20,
        },
        type: "@n8n/n8n-nodes-langchain.memoryPostgresChat",
        typeVersion: 1.3,
        position: [6352, 1488],
        id: "11111111-0027-0027-0027-000000000027",
        name: "Postgres Chat Memory",
        credentials: { postgres: { id: "4Lg93s5KD2kDfIwm", name: "Dponke" } },
      },

      /* ── 28. Structured Output Parser ── */
      {
        parameters: {
          jsonSchemaExample: JSON.stringify({ mensaje: "Texto general de atencion al cliente SIN URL NI IMAGENES", archivos: [{ url: "URL de la imagen o archivo", descripcion: "Descripción breve y simplificada de la image o archivo basada en la descripción del archivo en Google Drive" }] }),
          autoFix: true,
        },
        type: "@n8n/n8n-nodes-langchain.outputParserStructured",
        typeVersion: 1.3,
        position: [6480, 1488],
        id: "11111111-0028-0028-0028-000000000028",
        name: "Structured Output Parser",
      },

      /* ── 29. OpenAI Chat Model1 (para auto-fix del parser) ── */
      {
        parameters: {
          model: { __rl: true, value: "gpt-4o-mini", mode: "list", cachedResultName: "gpt-4o-mini" },
          builtInTools: {},
          options: {},
        },
        type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
        typeVersion: 1.3,
        position: [6416, 1696],
        id: "11111111-0029-0029-0029-000000000029",
        name: "OpenAI Chat Model1",
        credentials: { openAiApi: { id: "sltQuLh27VHE6KFm", name: "VAPI AI" } },
      },

      /* ── 30. Edit Fields1 (mensaje de error) ── */
      {
        parameters: {
          assignments: { assignments: [{ id: "j1", name: "mensaje", value: "En este momento tengo un problema técnico. Pronto te responderán.", type: "string" }] },
          options: {},
        },
        type: "n8n-nodes-base.set",
        typeVersion: 3.4,
        position: [6720, 1264],
        id: "11111111-0030-0030-0030-000000000030",
        name: "Edit Fields1",
      },

      /* ── 31. HTTP Request12 (enviar texto via Demo Router /send) ── */
      {
        parameters: {
          method: "POST",
          url: `=${demoRouterUrl}/api/conversations/{{ $('Code in JavaScript').item.json.conversation_id }}/send`,
          sendBody: true,
          specifyBody: "json",
          jsonBody: `={{ JSON.stringify({ content: $json.output.mensaje }) }}`,
          options: {},
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.3,
        position: [6720, 1136],
        id: "11111111-0031-0031-0031-000000000031",
        name: "HTTP Request12",
      },

      /* ── 32. HTTP Request15 (guardar mensaje en Demo Router) ── */
      {
        parameters: {
          method: "POST",
          url: `=${demoRouterUrl}/api/conversations/{{ $('Code in JavaScript').item.json.conversation_id }}/messages`,
          sendBody: true,
          specifyBody: "json",
          jsonBody: `={{ JSON.stringify({\n  content: $('AI Agent').item.json.output.mensaje,\n  direction: "outbound",\n  senderType: "bot"\n}) }}`,
          options: {},
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.3,
        position: [6928, 1136],
        id: "11111111-0032-0032-0032-000000000032",
        name: "HTTP Request15",
      },

      /* ── 33. HTTP Request (enviar error via Demo Router /send) ── */
      {
        parameters: {
          method: "POST",
          url: `=${demoRouterUrl}/api/conversations/{{ $('Code in JavaScript').item.json.conversation_id }}/send`,
          sendBody: true,
          specifyBody: "json",
          jsonBody: `={{ JSON.stringify({ content: $json.mensaje }) }}`,
          options: {},
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.3,
        position: [6928, 1264],
        id: "11111111-0033-0033-0033-000000000033",
        name: "HTTP Request",
      },

      /* ── 34. Split Out1 (separar archivos del output) ── */
      {
        parameters: { fieldToSplitOut: "output.archivos", options: {} },
        type: "n8n-nodes-base.splitOut",
        typeVersion: 1,
        position: [6720, 1008],
        id: "11111111-0034-0034-0034-000000000034",
        name: "Split Out1",
      },

      /* ── 35. HTTP Request Media (enviar archivo via Demo Router /send) ── */
      {
        parameters: {
          method: "POST",
          url: `=${demoRouterUrl}/api/conversations/{{ $('Code in JavaScript').item.json.conversation_id }}/send`,
          sendBody: true,
          specifyBody: "json",
          jsonBody: `={{ JSON.stringify({\n  content: $json.descripcion,\n  mediaUrl: "https://drive.usercontent.google.com/download?id=" + $json.url + "&export=download&confirm=t",\n  mediaType: $json.mimeType ?? null\n}) }}`,
          options: {},
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.3,
        position: [6928, 1008],
        id: "11111111-0035-0035-0035-000000000035",
        name: "HTTP Request Media",
      },
    ],

    connections: {
      "Webhook":               { main: [[{ node: "Code in JavaScript", type: "main", index: 0 }]] },
      "Code in JavaScript":    { main: [[{ node: "Edit Fields",         type: "main", index: 0 }]] },
      "Edit Fields":           { main: [[{ node: "Normalizador",        type: "main", index: 0 }]] },
      "Normalizador":          { main: [[{ node: "If2",                 type: "main", index: 0 }]] },
      "If2": { main: [
        [{ node: "Edit Fields5",   type: "main", index: 0 }],
        [{ node: "HTTP Request2",  type: "main", index: 0 }],
      ]},
      "HTTP Request2":         { main: [[{ node: "Switch",              type: "main", index: 0 }]] },
      "Switch": { main: [
        [{ node: "HTTP Request13", type: "main", index: 0 }],
        [{ node: "HTTP Request8",  type: "main", index: 0 }],
        [{ node: "HTTP Request14", type: "main", index: 0 }],
      ]},
      "HTTP Request13":        { main: [[{ node: "Transcribe a recording", type: "main", index: 0 }]] },
      "Transcribe a recording":{ main: [[{ node: "Edit Fields2",        type: "main", index: 0 }]] },
      "Edit Fields2":          { main: [[{ node: "Edit Fields5",        type: "main", index: 0 }]] },
      "HTTP Request8":         { main: [[{ node: "Analyze image",       type: "main", index: 0 }]] },
      "Analyze image":         { main: [[{ node: "Edit Fields3",        type: "main", index: 0 }]] },
      "Edit Fields3":          { main: [[{ node: "Edit Fields5",        type: "main", index: 0 }]] },
      "HTTP Request14":        { main: [[{ node: "Extract from File",   type: "main", index: 0 }]] },
      "Extract from File":     { main: [[{ node: "Edit Fields4",        type: "main", index: 0 }]] },
      "Edit Fields4":          { main: [[{ node: "Edit Fields5",        type: "main", index: 0 }]] },
      "Edit Fields5": { main: [[
        { node: "Respond to Webhook1", type: "main", index: 0 },
        { node: "Dynasty",             type: "main", index: 0 },
      ]]},
      "Respond to Webhook1":   { main: [[]] },
      "Dynasty":               { main: [[{ node: "Redis",   type: "main", index: 0 }]] },
      "Redis":                 { main: [[{ node: "Switch1", type: "main", index: 0 }]] },
      "Switch1": { main: [
        [],
        [{ node: "Redis1", type: "main", index: 0 }],
        [{ node: "Wait1",  type: "main", index: 0 }],
      ]},
      "Wait1":                 { main: [[{ node: "Redis",        type: "main", index: 0 }]] },
      "Redis1":                { main: [[{ node: "Edit Fields7", type: "main", index: 0 }]] },
      "Edit Fields7":          { main: [[{ node: "AI Agent",     type: "main", index: 0 }]] },
      "AI Agent": { main: [
        [
          { node: "Split Out1",      type: "main", index: 0 },
          { node: "HTTP Request12",  type: "main", index: 0 },
        ],
        [{ node: "Edit Fields1", type: "main", index: 0 }],
      ]},
      "OpenAI Chat Model":      { ai_languageModel: [[{ node: "AI Agent",                type: "ai_languageModel", index: 0 }]] },
      "Postgres Chat Memory":   { ai_memory:        [[{ node: "AI Agent",                type: "ai_memory",        index: 0 }]] },
      "Structured Output Parser": { ai_outputParser: [[{ node: "AI Agent",               type: "ai_outputParser",  index: 0 }]] },
      "OpenAI Chat Model1":     { ai_languageModel: [[{ node: "Structured Output Parser", type: "ai_languageModel", index: 0 }]] },
      "HTTP Request12":         { main: [[]] },
      "Edit Fields1":           { main: [[{ node: "HTTP Request",    type: "main", index: 0 }]] },
      "Split Out1":             { main: [[{ node: "HTTP Request Media", type: "main", index: 0 }]] },
    },

    settings: { executionOrder: "v1" },
  };
}
