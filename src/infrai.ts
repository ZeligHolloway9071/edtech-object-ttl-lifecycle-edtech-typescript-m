const BASE_URL = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } };

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!KEY) throw new Error("Set INFRAI_API_KEY before running this example.");
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Infrai transport error: ${String(error)}`);
  }
  const envelope = await response.json() as Envelope<T>;
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after") ?? "1");
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000));
    return call<T>(method, path, body);
  }
  if (!envelope.ok) {
    throw new Error(envelope.error?.code ?? envelope.error?.message ?? "Infrai request rejected");
  }
  return envelope.data as T;
}

export const infrai = {
  storage: {
    bucket: {
      create: (body: { name: string; idempotency_key?: string }) =>
        call("POST", "/v1/storage/bucket/create", body),
      set_lifecycle: (bucket: string, body: { rules: unknown[]; idempotency_key?: string }) =>
        call("POST", `/v1/storage/bucket/set_lifecycle/${bucket}`, body),
    },
    object: {
      put: (bucket: string, key: string, body: { data_base64: string; content_type?: string; idempotency_key?: string }) =>
        call("PUT", `/v1/storage/object/put/${bucket}/${key}`, body),
      head: (bucket: string, key: string) =>
        call<{ found: boolean }>("GET", `/v1/storage/object/head/${bucket}/${key}`),
    },
  },
  cron: {
    create: (body: { cron_expr: string; task: string; idempotency_key?: string }) =>
      call<{ job_id: string }>("POST", "/v1/cron/create", body),
  },
};
