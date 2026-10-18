export function FormMessage({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error)
    return (
      <p role="alert" className="notice-danger py-2.5 font-medium">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="notice-success py-2.5 font-medium">
        {state.ok}
      </p>
    );
  return null;
}
