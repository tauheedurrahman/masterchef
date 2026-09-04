import { insforgeAdmin } from "@/lib/insforge";

/**
 * POST /api/contact
 *
 * The /contact form's enquiries. Each one is stored in `contact_messages` so
 * the owner has a list to call back from — the form used to be a demo that
 * dropped what people typed.
 *
 * Writes go through the admin client: RLS is enabled on the table with no
 * policies, so the anon role can neither read other people's messages nor
 * insert on its own. Validation therefore has to happen here rather than
 * relying on the database.
 */

interface IncomingMessage {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
}

/** Same rule the checkout uses, so one bad format is not accepted in two ways. */
const PHONE_RE = /^03\d{2}-?\d{7}$/;

/** Long enough for a real enquiry, short enough that the column stays sane. */
const MAX_MESSAGE = 2000;

export async function POST(request: Request) {
  let body: IncomingMessage;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!phone) errors.push("Phone is required.");
  else if (!PHONE_RE.test(phone)) errors.push("Phone must look like 03XX-XXXXXXX.");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push("Email is not valid.");
  if (!message) errors.push("Message is required.");
  else if (message.length > MAX_MESSAGE)
    errors.push(`Message must be under ${MAX_MESSAGE} characters.`);

  if (errors.length) {
    return Response.json({ error: errors.join(" "), errors }, { status: 400 });
  }

  const { error } = await insforgeAdmin()
    .database.from("contact_messages")
    .insert([
      {
        name,
        phone,
        email: email || null,
        message,
      },
    ]);

  if (error) {
    console.error("[contact] insert failed:", error.message ?? JSON.stringify(error));
    return Response.json(
      { error: "We could not send your message. Please call us instead." },
      { status: 503 }
    );
  }

  return Response.json({ ok: true });
}
