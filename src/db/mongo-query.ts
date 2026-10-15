import { MongoClient, type Collection, type Document } from "mongodb";
import { getTableName } from "drizzle-orm";

type AnyTable = Record<string, any>;
type Expr = { kind: string; args: any[] };
const isExpr = (v: any): v is Expr => !!v && typeof v === "object" && typeof v.kind === "string" && Array.isArray(v.args);
const col = (v: any) => !!v && typeof v === "object" && typeof v.name === "string" && v.table;
export const eq = (a: any, b: any): Expr => ({kind:"eq",args:[a,b]});
export const ne = (a: any, b: any): Expr => ({kind:"ne",args:[a,b]});
export const and = (...xs: any[]): Expr => ({kind:"and",args:xs.filter(Boolean)});
export const or = (...xs: any[]): Expr => ({kind:"or",args:xs.filter(Boolean)});
export const inArray = (a: any, b: any[]): Expr => ({kind:"in",args:[a,b]});
export const like = (a: any, b: string): Expr => ({kind:"like",args:[a,b]});
export const isNull = (a: any): Expr => ({kind:"isNull",args:[a]});
export const isNotNull = (a: any): Expr => ({kind:"isNotNull",args:[a]});
export const desc = (a: any) => ({kind:"sort",column:a,dir:-1});
export const asc = (a: any) => ({kind:"sort",column:a,dir:1});
export function sql<T=unknown>(strings: TemplateStringsArray, ...values: any[]): {kind:string;text:string;values:any[]} { return {kind:"sql", text:strings.join("?"), values}; }
function tableName(t: AnyTable) { return getTableName(t as any); }
function isTable(v:any): boolean { try { return !!v && typeof v === "object" && Object.values(v).some((x:any)=>x && typeof x === "object" && x.table === v) && !!getTableName(v); } catch { return false; } }
function propName(t: AnyTable, c: any): string { return Object.keys(t).find(k => t[k] === c) || c?.name || ""; }
function colValue(ctx: Record<string, any>, c: any) { const t = c?.table; const name = t ? tableName(t) : ""; const obj = ctx[name] ?? ctx.__root; return obj?.[propName(t, c)]; }
function mongoFilter(expr:any, table:AnyTable): Record<string,any> | null {
  if (!isExpr(expr)) return null;
  if (expr.kind === "and") {
    const parts=expr.args.map((x:any)=>mongoFilter(x,table));
    const usable=parts.filter((x:any)=>x!==null);
    return usable.length ? (usable.length===1 ? usable[0] : {$and:usable}) : null;
  }
  if (expr.kind === "or") {
    const parts=expr.args.map((x:any)=>mongoFilter(x,table));
    return parts.every((x:any)=>x!==null) ? {$or:parts} : null;
  }
  const [a,b]=expr.args;
  if (!col(a) || a.table !== table) return null;
  const key=propName(table,a);
  if (expr.kind === "eq") return {[key]:b};
  if (expr.kind === "ne") return {[key]:{$ne:b}};
  if (expr.kind === "in") return {[key]:{$in:Array.isArray(b)?b:[]}};
  if (expr.kind === "isNull") return {[key]:null};
  if (expr.kind === "isNotNull") return {[key]:{$ne:null}};
  if (expr.kind === "like") { const pattern=String(b).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/%/g,".*").replace(/_/g,"."); return {[key]:{$regex:`^${pattern}$`,$options:"i"}}; }
  return null;
}
function evaluate(expr: any, ctx: Record<string, any>): boolean {
  if (!expr) return true;
  if (!isExpr(expr)) return true;
  const [a,b] = expr.args;
  if (expr.kind === "and") return expr.args.every((x:any)=>evaluate(x,ctx));
  if (expr.kind === "or") return expr.args.some((x:any)=>evaluate(x,ctx));
  const av = col(a) ? colValue(ctx,a) : a; const bv = col(b) ? colValue(ctx,b) : b;
  switch(expr.kind) {
    case "eq": return av === bv || (av instanceof Date && bv instanceof Date && av.getTime()===bv.getTime());
    case "ne": return av !== bv;
    case "in": return Array.isArray(bv) && bv.includes(av);
    case "like": { const pattern=String(bv).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/%/g,".*").replace(/_/g,"."); return new RegExp(`^${pattern}$`,`i`).test(String(av ?? "")); }
    case "isNull": return av == null;
    case "isNotNull": return av != null;
    default: return true;
  }
}
let clientPromise: Promise<MongoClient> | undefined;
let indexesPromise: Promise<void> | undefined;
function client() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured. Add your MongoDB Atlas connection string to the deployment environment variables.");
  if (!clientPromise) { const c = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10, minPoolSize: 0 }); clientPromise = c.connect().catch(e => { clientPromise=undefined; throw e; }); }
  return clientPromise;
}
async function collection(t: AnyTable): Promise<Collection<Document>> { const c=await client(); if(!indexesPromise) indexesPromise=ensureIndexes(c).catch(e=>{indexesPromise=undefined;throw e;}); await indexesPromise; const dbName=process.env.MONGODB_DATABASE || new URL(process.env.MONGODB_URI!).pathname.replace(/^\//,"").split("?")[0] || "stewardbridge"; return c.db(dbName).collection(tableName(t)); }
async function ensureIndexes(c: MongoClient) {
  const database = c.db(process.env.MONGODB_DATABASE || new URL(process.env.MONGODB_URI!).pathname.replace(/^\//,"").split("?")[0] || "stewardbridge");
  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true, name: "users_email_unique" }),
    database.collection("candidate_profiles").createIndex({ userId: 1 }, { unique: true, name: "candidate_profiles_user_unique" }),
    database.collection("business_profiles").createIndex({ userId: 1 }, { unique: true, name: "business_profiles_user_unique" }),
    database.collection("site_content").createIndex({ key: 1 }, { unique: true, name: "site_content_key_unique" }),
    database.collection("applications").createIndex({ jobId: 1, candidateId: 1 }, { unique: true, name: "applications_job_candidate_unique" }),
    database.collection("saved_jobs").createIndex({ jobId: 1, candidateId: 1 }, { unique: true, name: "saved_jobs_job_candidate_unique" }),
    database.collection("jobs").createIndex({ status: 1, createdAt: -1 }, { name: "jobs_status_created_idx" }),
    database.collection("notifications").createIndex({ userId: 1, createdAt: -1 }, { name: "notifications_user_created_idx" }),
  ]).then(()=>undefined);
}
function defaults(t: AnyTable, row: any) {
  const out={...row};
  if (!out.id) out.id=crypto.randomUUID();
  const now=new Date();
  for (const [key,c] of Object.entries(t)) {
    if (out[key] !== undefined || !c) continue;
    if (["createdAt","updatedAt"].includes(key)) out[key]=now;
    else if (c.default !== undefined) out[key]=c.default;
    else if (key === "onboardingComplete" || key === "isAdminAuthorized") out[key]=false;
  }
  for (const k of ["skills","rolesWanted","rolesNotWanted","preferredLocations","languages","certifications","shiftPreferences","industries","benefits","typicalRoles","benefitsOffered"]) if (out[k] === undefined && Object.prototype.hasOwnProperty.call(t,k)) out[k]=[];
  const table = tableName(t);
  const defaultsByTable: Record<string, Record<string, any>> = {
    jobs: { status: "draft", openings: 1, urgent: false, salaryCurrency: "NGN" },
    applications: { status: "submitted" },
    staffing_requests: { status: "open", quantity: 1 },
    team_members: { status: "team_member" },
    documents: { category: "other", isPrivate: true },
    notifications: { isRead: false },
    calendar_events: { type: "meeting" },
    webhook_endpoints: { isActive: true },
    webhook_events: { attempts: 0 },
    ai_conversations: { title: "New conversation" },
    ai_messages: { status: "answer" },
    agent_tickets: { status: "open" },
    webhook_events: { status: "pending" },
    agent_drafts: { status: "pending" },
    users: { onboardingComplete: false, isAdminAuthorized: false },
    candidate_profiles: { openToFuture: true, willingToRelocate: false, hasOwnTransport: false, onboardingStep: 0 },
    business_profiles: { onboardingStep: 0 },
  };
  for (const [key,value] of Object.entries(defaultsByTable[table] || {})) if (out[key] === undefined) out[key]=value;
  if (out.createdAt === undefined) out.createdAt=now;
  if (out.updatedAt === undefined) out.updatedAt=now;
  return out;
}
class SelectBuilder {
  private source?: AnyTable; private joins: {table:AnyTable; on:any; left:boolean}[]=[]; private predicate:any; private sorts:any[]=[]; private max?:number; private grouping:any[]=[];
  constructor(private selection:any){}
  from(t:AnyTable){this.source=t;return this;}
  innerJoin(t:AnyTable,on:any){this.joins.push({table:t,on,left:false});return this;}
  leftJoin(t:AnyTable,on:any){this.joins.push({table:t,on,left:true});return this;}
  where(p:any){this.predicate=p;return this;}
  orderBy(...s:any[]){this.sorts=s;return this;}
  limit(n:number){this.max=n;return this;}
  groupBy(...cols:any[]){this.grouping=cols;return this;}
  async then(resolve:any,reject:any){try{resolve(await this.run())}catch(e){reject?.(e)}}
  private async run(){
    if(!this.source) return [];
    const baseFilter=mongoFilter(this.predicate,this.source); const base=await (await collection(this.source)).find(baseFilter || {}).toArray();
    let contexts=base.map(r=>({__root:r,[tableName(this.source!)]:r}));
    for(const j of this.joins){const other=await (await collection(j.table)).find({}).toArray();const next:any[]=[];for(const ctx of contexts){let found=false;for(const r of other){const c={...ctx,[tableName(j.table)]:r};if(evaluate(j.on,c)){next.push(c);found=true;}}if(!found&&j.left)next.push({...ctx,[tableName(j.table)]:null});}contexts=next;}
    contexts=contexts.filter(c=>evaluate(this.predicate,c));
    for(const s of this.sorts.slice().reverse()){const c=s?.column;const name=tableName(c?.table);const key=propName(c?.table,c);contexts.sort((a,b)=>{const x=a[name]?.[key],y=b[name]?.[key];return x<y?-(s.dir||1):x>y?(s.dir||1):0;});}
    if(this.grouping.length){const groups=new Map<string,any>();for(const c of contexts){const vals=this.grouping.map(x=>colValue(c,x));const key=JSON.stringify(vals);if(!groups.has(key)){const row:any={};for(const [k,v] of Object.entries(this.selection||{})){if(col(v))row[k]=colValue(c,v);else if(v?.kind==="sql")row[k]=0;}groups.set(key,row);}const row=groups.get(key);for(const [k,v] of Object.entries(this.selection||{})){if(v?.kind==="sql"&&String(v.text).includes("count"))row[k]=(row[k]||0)+1;}}contexts=Array.from(groups.values()).map(x=>({__projected:x}));}
    if(this.max!==undefined)contexts=contexts.slice(0,this.max);
    if(this.grouping.length)return contexts.map(c=>c.__projected);
    return contexts.map(c=>{if(!this.selection)return c.__root;const out:any={};for(const [k,v] of Object.entries(this.selection)){if(col(v)){const tn=tableName(v.table);out[k]=c[tn]?.[propName(v.table,v)];}else if(v?.kind==="sql")out[k]=0;else if(v===undefined)out[k]=undefined;}return out;});
  }
}
class InsertBuilder {
  private rows:any[]=[]; private conflict:any; private returningSelection:any;
  constructor(private table:AnyTable){}
  values(v:any|any[]){this.rows=(Array.isArray(v)?v:[v]).map(x=>defaults(this.table,x));return this;}
  onConflictDoUpdate(v:any){this.conflict=v;return this;}
  returning(selection?:any){this.returningSelection=selection??true;return this;}
  async then(resolve:any,reject:any){try{resolve(await this.run())}catch(e){reject?.(e)}}
  private async run(){const c=await collection(this.table);const out:any[]=[];for(const row of this.rows){if(this.conflict){const key=propName(this.table,this.conflict.target);const value=row[key];const existing=await c.findOne({[key]:value});if(existing){const set=this.conflict.set||{};await c.updateOne({[key]:value},{$set:set});out.push({...existing,...set});continue;}}await c.insertOne(row);out.push(row);}return this.returningSelection?out.map(r=>this.project(r)):[];}
  private project(r:any){if(this.returningSelection===true)return r;const out:any={};for(const [k,v] of Object.entries(this.returningSelection||{}))out[k]=col(v)?r[propName(this.table,v)]:undefined;return out;}
}
class UpdateBuilder {
 private changes:any={};private predicate:any;private ret:any;
 constructor(private table:AnyTable){}
 set(v:any){this.changes=v;return this;} where(p:any){this.predicate=p;return this;} returning(s?:any){this.ret=s??true;return this;}
 async then(resolve:any,reject:any){try{resolve(await this.run())}catch(e){reject?.(e)}}
 private async run(){const c=await collection(this.table);const all=await c.find({}).toArray();const rows=all.filter(r=>evaluate(this.predicate,{__root:r,[tableName(this.table)]:r}));for(const r of rows)await c.updateOne({id:r.id},{$set:this.changes});return this.ret?rows.map(r=>({...r,...this.changes})):[];}
}
class DeleteBuilder {private predicate:any;constructor(private table:AnyTable){} where(p:any){this.predicate=p;return this;} async then(resolve:any,reject:any){try{const c=await collection(this.table);const all=await c.find({}).toArray();const rows=all.filter(r=>evaluate(this.predicate,{__root:r,[tableName(this.table)]:r}));if(rows.length)await c.deleteMany({id:{$in:rows.map(r=>r.id)}});resolve({deletedCount:rows.length});}catch(e){reject?.(e)}}}
export const db:any={select:(selection?:any)=>new SelectBuilder(selection),insert:(t:AnyTable)=>new InsertBuilder(t),update:(t:AnyTable)=>new UpdateBuilder(t),delete:(t:AnyTable)=>new DeleteBuilder(t),execute:async (_query:any)=>{const c=await client();return c.db(process.env.MONGODB_DATABASE || "admin").command({ping:1});}};
export async function checkMongoConnection(){const c=await client();await c.db(process.env.MONGODB_DATABASE || "admin").command({ping:1});return true;}
