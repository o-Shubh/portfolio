"use client";

import { sendContactMessage } from "@/app/actions/contact";
import { FormMessage } from "@/components/FormMessage";
import { CONTACT_TOPICS } from "@/lib/contact";
import { useFormAction } from "@/lib/use-form-action";

/** Contact form. Works for guests; prefilled for logged-in readers. */
export function ContactForm({ name, email }: { name?: string; email?: string }) {
  const [state, submit, pending] = useFormAction(sendContactMessage);
  if (state?.ok)
    return (
      <div className="notice-success" role="status">
        {state.ok}
      </div>
    );
  return (
    <form onSubmit={submit} className="card space-y-4" aria-labelledby="contact-form-h">
      <h2 id="contact-form-h" className="mt-0 text-xl">
        Send us a message
      </h2>
      {/* Hidden from people; bots fill it in */}
      <div className="hidden" aria-hidden>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label">
            Your name
          </label>
          <input id="c-name" name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={name} className="field" />
        </div>
        <div>
          <label htmlFor="c-email" className="label">
            Email
          </label>
          <input id="c-email" name="email" type="email" required autoComplete="email" inputMode="email" defaultValue={email} className="field" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-topic" className="label">
            About
          </label>
          <select id="c-topic" name="topic" required defaultValue="" className="field">
            <option value="" disabled>
              Choose
            </option>
            {Object.entries(CONTACT_TOPICS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="c-order" className="label">
            Order number <span className="font-normal text-muted">(if any)</span>
          </label>
          <input id="c-order" name="order_number" maxLength={40} autoCapitalize="characters" placeholder="EIP-…" className="field" />
        </div>
      </div>
      <div>
        <label htmlFor="c-phone" className="label">
          Phone <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="c-phone" name="phone" type="tel" maxLength={20} autoComplete="tel" className="field sm:max-w-xs" />
      </div>
      <div>
        <label htmlFor="c-message" className="label">
          Message
        </label>
        <textarea id="c-message" name="message" required minLength={10} maxLength={4000} rows={5} className="field py-2.5" />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
