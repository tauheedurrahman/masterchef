-- Enquiries sent from the /contact form.
--
-- The form used to be a demo that threw the message away. It now POSTs to
-- /api/contact, which writes a row here through the admin client, so the
-- owner has a record to call back from.
--
-- RLS is on with no SELECT policy on purpose: nothing in the storefront reads
-- these back, and the anon role must never be able to list other people's
-- messages. Writes go through the server-side admin client, which bypasses RLS.
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx
  ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
