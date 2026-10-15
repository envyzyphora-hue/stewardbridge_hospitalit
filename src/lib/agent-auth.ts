import crypto from "node:crypto";

/** Shared secret for trusted server-to-server calls only. Configure it in both systems' secret stores. */
export function requireAgent(req: Request) {
  const secret = process.env.STEWARD_BRIDGE_AGENT_WEBHOOK_SECRET || "";
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    || req.headers.get("x-stewardbridge-agent-secret") || "";
  if (!secret || secret.length < 32 || !supplied || Buffer.byteLength(supplied) !== Buffer.byteLength(secret)
    || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) {
    throw new Response("Unauthorized agent request", { status: 401, headers: { "cache-control": "no-store" } });
  }
}
