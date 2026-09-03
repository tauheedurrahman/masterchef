import { insforgeAdmin } from "@/lib/insforge";

const BUCKET = "menu-images";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** POST /api/admin/upload — multipart form with a `file` field. */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected a multipart form upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return Response.json(
      { error: "Only JPEG, PNG or WebP images are allowed." },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image must be 8MB or smaller." }, { status: 413 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const rawName = form.get("name");
  const safe =
    typeof rawName === "string"
      ? rawName.replace(/[^a-z0-9-]/gi, "-").slice(0, 50)
      : "";
  const key = `menu/${safe || "upload"}-${Date.now()}.${ext}`;

  const { data, error } = await insforgeAdmin().storage.from(BUCKET).upload(key, file);
  if (error || !data) {
    console.error("[admin] upload failed:", error?.message ?? JSON.stringify(error));
    return Response.json({ error: "Upload failed." }, { status: 503 });
  }

  return Response.json({ ok: true, url: data.url, key: data.key });
}
