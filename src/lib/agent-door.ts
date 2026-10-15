import { requireAgent } from '@/lib/agent-auth';
export function guard(req: Request) { requireAgent(req); }
