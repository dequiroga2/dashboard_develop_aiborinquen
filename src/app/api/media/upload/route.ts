import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_MEDIA_BUCKET || "Clientes";

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  };
  return map[mimeType] || "bin";
}

/**
 * POST /api/media/upload
 *
 * Accepts a file (multipart/form-data with field "file" OR raw binary body)
 * from n8n, uploads it to Supabase Storage, and returns the public URL.
 *
 * n8n uses this as an intermediary so Twilio can fetch the file
 * from a publicly accessible URL (Google Drive links don't work anonymously).
 */
export async function POST(req: NextRequest) {
  // Allow n8n to call this using the webhook secret (same pattern as /send)
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-demo-router-secret");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("[media/upload] Supabase env vars not set");
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const contentType = req.headers.get("content-type") || "application/octet-stream";
    let fileBuffer: Buffer;
    let mimeType: string;

    if (contentType.includes("multipart/form-data")) {
      // n8n HTTP Request node sends binary as form-data field "file"
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file field in form-data" }, { status: 400 });
      }
      mimeType = file.type || "application/octet-stream";
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      // Raw binary body
      mimeType = contentType.split(";")[0].trim();
      fileBuffer = Buffer.from(await req.arrayBuffer());
    }

    if (fileBuffer.length === 0) {
      return NextResponse.json({ error: "Empty file body" }, { status: 400 });
    }

    const ext = getExtension(mimeType);
    const filename = `temp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": mimeType,
        "x-upsert": "true",
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error("[media/upload] Supabase upload failed:", uploadRes.status, err);
      return NextResponse.json({ error: "Supabase upload failed" }, { status: 500 });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
    console.log("[media/upload] Uploaded to Supabase:", publicUrl);
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[media/upload] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
