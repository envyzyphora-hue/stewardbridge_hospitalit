import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
}

const adminUsers = read('src/app/api/admin/users/route.ts');
check('Admin user API uses explicit safe field projection', adminUsers.includes('id: users.id') && !adminUsers.includes('db.select().from(users)') && !adminUsers.includes('passwordHash'));
const docRoute = read('src/app/api/documents/[id]/route.ts');
check('Employer document access is stage-gated', ['shortlisted', 'interview', 'accepted'].every((s) => docRoute.includes(`"${s}"`)) && docRoute.includes('document.read'));
const agentAuth = read('src/lib/agent-auth.ts');
check('Agent door rejects missing/weak secrets', agentAuth.includes('secret.length < 32') && agentAuth.includes('timingSafeEqual'));
const agentDocuments = read('src/app/api/agent-door/documents/route.ts');
check('Agent document retrieval requires a human-approved document draft', agentDocuments.includes('A human-approved document access request is required') && agentDocuments.includes('agentDrafts.type, "read_document"'));
check('Agent business mutations are staged as drafts', read('src/app/api/agent/control/route.ts').includes('status: "pending"') && read('src/app/api/agent/control/route.ts').includes('pending_approval'));
const chat = read('src/app/api/agent/chat/route.ts');
check('Chat payload includes n8n-compatible user.id and conversation ID', chat.includes('user: { id: user.id') && chat.includes('conversation_id: conversationId'));
check('Chat acknowledgement is not treated as an AI answer', chat.includes('data.status === "working"') && chat.includes('pending: true'));
const events = read('src/lib/webhooks.ts');
check('Event delivery is separate from interactive chat webhook', events.includes('STEWARD_BRIDGE_EVENTS_WEBHOOK_URL') && !events.includes('STEWARD_BRIDGE_AGENT_WEBHOOK_URL ?? process.env.EXTERNAL_AGENT_WEBHOOK_URL'));
check('Contact endpoint validates input, rate-limits, and emails the configured admin when mail is configured', read('src/app/api/contact/route.ts').includes('rateLimited(ip)') && read('src/app/api/contact/route.ts').includes('schema.safeParse(input)') && read('src/app/api/contact/route.ts').includes('sendAdminEmailAlert'));
check('CV uploads notify the admin mailbox without attaching private files', read('src/app/api/documents/route.ts').includes('sendAdminEmailAlert') && read('src/app/api/documents/route.ts').includes('requiresAuthorisedRetrieval') && read('src/app/api/documents/route.ts').includes('For privacy, the file is not attached'));
check('Server email helper never requires or includes a user password', read('src/lib/admin-email.ts').includes('Never include passwords') && read('src/lib/admin-email.ts').includes('RESEND_API_KEY'));

const packageJson = JSON.parse(read('package.json'));
check('MongoDB driver is installed and PostgreSQL driver is removed', packageJson.dependencies?.mongodb && !packageJson.dependencies?.['@neondatabase/serverless'] && !packageJson.dependencies?.pg);
check('MongoDB connection is the only application database connection', read('src/db/index.ts').includes('mongo-query') && read('src/db/mongo-query.ts').includes('MONGODB_URI') && !read('src/db/index.ts').includes('DATABASE_URL'));
check('Cloudflare OpenNext deployment config is present', fs.existsSync(path.join(root, 'open-next.config.ts')) && fs.existsSync(path.join(root, 'wrangler.jsonc')) && packageJson.scripts?.deploy?.includes('opennextjs-cloudflare'));
check('Example environment uses MongoDB Atlas configuration', read('.env.example').includes('MONGODB_URI=') && !read('.env.example').includes('DATABASE_URL='));

const contract = read('INTEGRATION_CONTRACT.md');
check('External n8n workflow is intentionally separate from the website bundle', !fs.existsSync(path.join(root, 'integrations/StewardBridge_n8n_All_In_One.json')) && contract.includes('external agent remains a separate deployment'));
check('Integration contract documents the real reply requirement', contract.includes('real `reply` string') && contract.includes('acknowledgement'));
check('Integration contract documents sign-in alerts and private storage boundary', contract.includes('Successful sign-ins') && contract.includes('Private files and agent memory boundary'));
check('Sign-in audit and configurable email alert are implemented in code', read('src/lib/auth.ts').includes('auth.sign_in') && read('src/lib/auth.ts').includes('RESEND_API_KEY'));
check('Contact defaults use configured email and WhatsApp number', read('src/app/api/contact/route.ts').includes('elubodetimothy@gmail.com') && read('src/app/api/contact/route.ts').includes('2347066510205'));
check('Example environment keeps deployment secrets as placeholders', read('.env.example').includes('STEWARD_BRIDGE_AGENT_WEBHOOK_SECRET=') && read('.env.example').includes('ADMIN_EMAIL=admin@example.com'));

for (const result of checks) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
const failures = checks.filter((x) => !x.ok);
console.log(`\n${checks.length - failures.length}/${checks.length} static bundle checks passed.`);
if (failures.length) process.exitCode = 1;
