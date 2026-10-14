export function FormMessage({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error)
    return (
      <p role="alert" className="text-sm font-medium text-danger">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="text-sm font-medium text-success">
        {state.ok}
      </p>
    );
  return null;
}
