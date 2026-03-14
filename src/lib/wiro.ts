const API_KEY = import.meta.env.VITE_WIRO_API_KEY as string;
const API_SECRET = import.meta.env.VITE_WIRO_API_SECRET as string;

async function sign(nonce: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(API_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(API_SECRET + nonce));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function nonce() {
  return Math.floor(Date.now() / 1000).toString();
}

async function authHeaders() {
  const n = nonce();
  const sig = await sign(n);
  return {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "x-nonce": n,
    "x-signature": sig,
  };
}

export async function submitImageTask(prompt: string): Promise<string> {
  const res = await fetch("/wiro-api/v1/Run/black-forest-labs/flux-2-klein-4b", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      selectedModel: "1677",
      prompt,
      negativePrompt: "blurry, low quality, watermark, text, logo, ugly",
      steps: "4",
      scale: "1",
      samples: "1",
      seed: "1849728585",
      width: "1024",
      height: "1024",
    }),
  });

  const data = await res.json();
  if (!data.result || !data.socketaccesstoken) {
    throw new Error(data.errors?.[0]?.message ?? "Task submission failed");
  }
  return data.socketaccesstoken as string;
}

export async function pollTask(token: string): Promise<string | null> {
  const res = await fetch("/wiro-api/v1/Task/Detail", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ tasktoken: token }),
  });

  const data = await res.json();
  const task = data.tasklist?.[0];
  if (!task) throw new Error("No task found");

  if (task.status === "task_cancel") throw new Error("Task was cancelled");

  if (task.status === "task_postprocess_end") {
    const url = task.outputs?.[0]?.url as string | undefined;
    if (url) return url;
    throw new Error("Task done but no output URL");
  }

  return null; // still pending
}
