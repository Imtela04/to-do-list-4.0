export function getErrorMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { detail?: string; message?: string } };
    message?: string;
  };
  return (
    e.response?.data?.detail   ??
    e.response?.data?.message  ??
    e.message                  ??
    'Something went wrong.'
  );
}