import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const app = express();
const port = Number(process.env.PORT || 3001);
const scrypt = promisify(scryptCallback);
const allowedOrigins = new Set(
  (
    process.env.APP_ORIGINS ||
    'http://localhost:3000,https://ijeshadigitalhub.com'
  )
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
);

const databaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 8000,
  max: 5,
};

const databaseConfigured = Boolean(databaseConfig.database && databaseConfig.user && databaseConfig.password);
const pool = databaseConfigured ? new Pool(databaseConfig) : null;

// An idle-client error with no listener crashes Node, which shows up as a 502.
pool?.on('error', (error) => console.error('Postgres pool error:', error?.code || error?.message));
// Last line of defence: log instead of dying so the proxy never sees a dead app.
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
process.on('uncaughtException', (error) => console.error('Uncaught exception:', error));

if (!databaseConfigured) {
  console.error('DB_NAME, DB_USER and DB_PASSWORD are not all set. Check the environment variables in cPanel.');
}

// Express 4 does not catch errors thrown in async handlers. This wrapper does.
const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.disable('x-powered-by');
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
// Application-level CORS runs before JSON parsing and every API route, and
// responds to browser OPTIONS preflight requests as well.
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// cPanel may pass its application URL prefix through to Express. Normalize
// requests like /aureliahomes/api/auth/login to /api/auth/login.
app.use((req, _res, next) => {
  const apiIndex = req.url.indexOf('/api/');
  if (apiIndex > 0) req.url = req.url.slice(apiIndex);
  next();
});

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${Buffer.from(key).toString('base64url')}`;
}

async function verifyPassword(password, encoded) {
  const [algorithm, n, r, p, saltText, keyText] = String(encoded || '').split('$');
  if (algorithm !== 'scrypt' || !saltText || !keyText) return false;
  try {
    const expected = Buffer.from(keyText, 'base64url');
    const actual = Buffer.from(await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
    }));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

function profileRole(roles) {
  const order = ['super_admin', 'admin', 'tenant', 'landlord', 'property_manager', 'contractor', 'agent', 'buyer', 'renter'];
  const role = order.find((candidate) => roles.includes(candidate)) || 'renter';
  return role === 'landlord' ? 'owner' : role;
}

async function getAccountProfile(accountId) {
  const result = await pool.query(
    `select a.id, a.email, p.full_name, p.phone,
      coalesce(array_agg(distinct pr.role::text) filter (where pr.role is not null), '{}') as roles
     from public.accounts a
     join public.profiles p on p.id = a.id
     left join public.profile_roles pr on pr.profile_id = a.id
     where a.id = $1 and a.status = 'active'
     group by a.id, a.email, p.full_name, p.phone`,
    [accountId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const name = row.full_name || row.email.split('@')[0];
  return {
    id: row.id,
    name,
    email: row.email,
    phone: row.phone || undefined,
    role: profileRole(row.roles),
    avatarInitials: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
  };
}

async function createSession(accountId) {
  const accessToken = randomBytes(32).toString('base64url');
  const refreshToken = randomBytes(48).toString('base64url');
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await pool.query(
    `insert into public.auth_sessions
      (id, account_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at)
     values ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), accountId, sha256(accessToken), sha256(refreshToken), accessExpiresAt, refreshExpiresAt],
  );
  return { access_token: accessToken, refresh_token: refreshToken, expires_in: 3600, expires_at: Math.floor(accessExpiresAt.getTime() / 1000) };
}

async function authenticate(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !pool) return res.status(401).json({ error: 'Sign in to continue' });
  try {
    const result = await pool.query(
      `select s.id as session_id, s.account_id
       from public.auth_sessions s
       join public.accounts a on a.id = s.account_id
       where s.access_token_hash = $1 and s.revoked_at is null
         and s.access_expires_at > now() and a.status = 'active'
       limit 1`,
      [sha256(token)],
    );
    if (!result.rows[0]) return res.status(401).json({ error: 'Your session expired. Sign in again.' });
    req.auth = result.rows[0];
    req.auth.profile = await getAccountProfile(req.auth.account_id);
    if (!req.auth.profile) return res.status(401).json({ error: 'Account profile is unavailable.' });
    return next();
  } catch {
    return res.status(503).json({ error: 'Authentication service is unavailable' });
  }
}

app.post('/api/auth/register', safe(async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured' });
  const email = normalizeEmail(req.body?.email);
  const fullName = String(req.body?.fullName || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const password = String(req.body?.password || '');
  if (!email || !email.includes('@') || !fullName || password.length < 8) {
    return res.status(400).json({ error: 'Enter a valid email, your full name, and a password of at least 8 characters.' });
  }
  let client;
  const accountId = randomUUID();
  try {
    client = await pool.connect();
    await client.query('begin');
    await client.query(
      `insert into public.accounts (id,email,password_hash,status) values ($1,$2,$3,'active')`,
      [accountId, email, await hashPassword(password)],
    );
    await client.query(
      `insert into public.profiles (id,full_name,email,phone) values ($1,$2,$3,$4)`,
      [accountId, fullName, email, phone || null],
    );
    await client.query(`insert into public.profile_roles(profile_id,role) values ($1,'renter')`, [accountId]);
    await client.query('commit');
    const session = await createSession(accountId);
    const user = await getAccountProfile(accountId);
    return res.status(201).json({ ...session, user: { id: accountId, email, user_metadata: { full_name: fullName, phone } }, profile: user });
  } catch (error) {
    await client?.query('rollback').catch(() => {});
    if (error?.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error('Register failed:', error?.code, error?.message);
    if (!client || ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', '28P01', '3D000', '57P03'].includes(error?.code) || /timeout|terminated/i.test(error?.message || '')) {
      return res.status(503).json({ error: 'The database is unavailable right now. Please try again shortly.' });
    }
    return res.status(500).json({ error: 'Could not create your account.' });
  } finally { client?.release(); }
}));

app.post('/api/auth/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured' });
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  try {
    const result = await pool.query(
      `select id, password_hash from public.accounts where email = $1 and status = 'active' limit 1`, [email],
    );
    const account = result.rows[0];
    if (!account || !(await verifyPassword(password, account.password_hash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    await pool.query('update public.accounts set last_sign_in_at = now() where id = $1', [account.id]);
    const session = await createSession(account.id);
    const user = await getAccountProfile(account.id);
    return res.json({ ...session, user: { id: user.id, email: user.email, user_metadata: { full_name: user.name, phone: user.phone } }, profile: user });
  } catch {
    return res.status(503).json({ error: 'Could not sign in right now. Try again shortly.' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  const refreshToken = String(req.body?.refresh_token || '');
  if (!pool || !refreshToken) return res.status(401).json({ error: 'Sign in again to continue.' });
  try {
    const result = await pool.query(
      `select id, account_id from public.auth_sessions
       where refresh_token_hash=$1 and revoked_at is null and refresh_expires_at > now() limit 1`,
      [sha256(refreshToken)],
    );
    const sessionRow = result.rows[0];
    if (!sessionRow) return res.status(401).json({ error: 'Your session expired. Sign in again.' });
    const accessToken = randomBytes(32).toString('base64url');
    const nextRefreshToken = randomBytes(48).toString('base64url');
    const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      `update public.auth_sessions set access_token_hash=$1, refresh_token_hash=$2,
       access_expires_at=$3, refresh_expires_at=$4 where id=$5`,
      [sha256(accessToken), sha256(nextRefreshToken), accessExpiresAt, refreshExpiresAt, sessionRow.id],
    );
    return res.json({ access_token: accessToken, refresh_token: nextRefreshToken, expires_in: 3600, expires_at: Math.floor(accessExpiresAt.getTime() / 1000) });
  } catch { return res.status(503).json({ error: 'Could not refresh your session.' }); }
});

app.get('/api/auth/me', authenticate, safe(async (req, res) => {
  const profile = await getAccountProfile(req.auth.account_id);
  return profile ? res.json(profile) : res.status(404).json({ error: 'Account profile not found.' });
}));

app.post('/api/auth/logout', authenticate, safe(async (req, res) => {
  await pool.query('update public.auth_sessions set revoked_at=now() where id=$1', [req.auth.session_id]);
  return res.status(204).end();
}));

// Read APIs use fixed table/column allowlists and server-derived ownership
// predicates. User supplied identifiers are never interpolated unchecked.
const DATA_TABLES = {
  profiles: ['id','full_name','email','phone','residential_address','profile_photo_path','identity_verification_status','created_at'],
  profile_roles: ['profile_id','role'], properties: ['id','external_key','owner_id','title','address','neighborhood','city','country','property_type','description','bedrooms','bathrooms','image_urls','currency','created_at'],
  property_units: ['id','property_id','unit_label','availability'], rental_listings: ['id','external_key','property_id','unit_id','status','rent_amount_minor','rent_frequency','deposit_amount_minor','currency','created_at'],
  rental_applications: ['id','listing_id','applicant_id','status','desired_move_in','occupation','message','created_at','updated_at'], rental_agreements: ['id','application_id','status','terms','lease_start','lease_end','payment_due_day','rent_amount_minor','deposit_amount_minor','fees','landlord_finalized_at','unsigned_document_path','signed_document_path','signed_document_ready_at','created_at'],
  agreement_signatures: ['id','agreement_id','signer_id','signer_role','status','signed_at','provider_signature_id'], payment_obligations: ['id','agreement_id','description','amount_minor','due_date','required'], payments: ['id','obligation_id','payer_id','amount_minor','currency','status','provider','provider_reference','receipt_number','verified_at','external_evidence_path','external_verified_by','created_at'],
  move_ins: ['id','agreement_id','status','move_in_date','landlord_confirmed_at','renter_confirmed_at','overdue_notified_at','keys_handed_over','meter_readings','outstanding_issues','created_at'], handover_items: ['id','move_in_id','item_key','completed','notes','photo_path'], tenancies: ['id','agreement_id','application_id','property_id','unit_id','landlord_id','tenant_id','status','start_date','end_date','activated_at','created_at'],
  notifications: ['id','recipient_id','title','body','action_path','read_at','created_at'], saved_rentals: ['renter_id','listing_id','created_at'], tenant_preferences: ['renter_id','email_notifications','payment_reminders','maintenance_updates','message_notifications','updated_at'], maintenance_requests: ['id','tenancy_id','property_id','requested_by','assigned_to','title','category','description','priority','status','attachment_path','resolution_notes','created_at','updated_at','scheduled_at','completion_notes','materials_used','labour_hours','after_attachment_path','assignment_response','assignment_responded_at'],
  rental_messages: ['id','tenancy_id','sender_id','recipient_id','body','read_at','created_at'], workflow_audit_events: ['id','actor_id','entity_type','entity_id','action','details','created_at'], integration_webhook_events: ['id','provider','event_id','event_type','payload','received_at','processed_at','processing_error'], viewing_requests: ['id','property_id','property_external_key','property_title','property_address','property_price','property_image','viewing_type','requested_date','time_slot','guest_name','guest_email','guest_phone','notes','agent_name','status','created_at'],
  property_manager_assignments: ['id','property_id','manager_id','status','assigned_at','ended_at'], property_inspections: ['id','property_id','unit_id','tenancy_id','manager_id','inspection_type','status','scheduled_at','notes','checklist','outcome','report_path','created_at','updated_at'], tenant_complaints: ['id','tenancy_id','requested_by','category','priority','title','description','status','manager_response','created_at','updated_at'], complaint_internal_notes: ['id','complaint_id','author_id','note','created_at'], property_expenses: ['id','property_id','submitted_by','category','description','amount_minor','currency','expense_date','receipt_path','approval_status','reviewed_by','reviewed_at','created_at'], maintenance_activity: ['id','request_id','actor_id','activity_type','note','created_at'], tenancy_requests: ['id','tenancy_id','requested_by','request_type','details','status','created_at','updated_at'],
};
const ident = (value) => `"${String(value).replaceAll('"','""')}"`;
const adminRoles = ['admin','super_admin'];
function accessPredicate(table, id) {
  const self = `$${id}`;
  const elevated = `exists(select 1 from public.profile_roles rr where rr.profile_id=${self} and rr.role::text in ('admin','super_admin'))`;
  const manager = (propertyExpr) => `exists(select 1 from public.property_manager_assignments ma where ma.property_id=${propertyExpr} and ma.manager_id=${self} and ma.status='active')`;
  const owner = (propertyExpr) => `exists(select 1 from public.properties ap where ap.id=${propertyExpr} and ap.owner_id=${self})`;
  const appAccess = `exists(select 1 from public.rental_applications a join public.rental_listings l on l.id=a.listing_id where a.id=%s and (a.applicant_id=${self} or ${owner('l.property_id')} or ${manager('l.property_id')} or ${elevated}))`;
  const tenancyAccess = `exists(select 1 from public.tenancies t where t.id=%s and (t.tenant_id=${self} or t.landlord_id=${self} or t.id in (select t2.id from public.tenancies t2 where ${manager('t2.property_id')}) or ${elevated}))`;
  const map = {
    profiles: `id=${self} or ${elevated}`, profile_roles: `profile_id=${self} or ${elevated}`,
    properties: `owner_id=${self} or ${manager('id')} or ${elevated} or exists(select 1 from public.rental_listings pl where pl.property_id=properties.id and pl.status='published')`,
    rental_listings: `status='published' or ${owner('property_id')} or ${manager('property_id')} or ${elevated}`,
    rental_applications: `applicant_id=${self} or ${ownerForApplication(self)} or ${elevated}`,
    rental_agreements: `${appAccess.replace('%s','rental_agreements.application_id')} or ${elevated}`,
    agreement_signatures: `signer_id=${self} or exists(select 1 from public.rental_agreements g where g.id=agreement_signatures.agreement_id and (${appAccess.replace('%s','g.application_id')}))`,
    payment_obligations: `exists(select 1 from public.rental_agreements g where g.id=payment_obligations.agreement_id and ${appAccess.replace('%s','g.application_id')})`,
    payments: `payer_id=${self} or exists(select 1 from public.payment_obligations o join public.rental_agreements g on g.id=o.agreement_id where o.id=payments.obligation_id and ${appAccess.replace('%s','g.application_id')})`,
    move_ins: `exists(select 1 from public.rental_agreements g where g.id=move_ins.agreement_id and ${appAccess.replace('%s','g.application_id')})`,
    handover_items: `exists(select 1 from public.move_ins m where m.id=handover_items.move_in_id and ${mapTenancyFromAgreement(appAccess,self)})`,
    tenancies: `tenant_id=${self} or landlord_id=${self} or ${manager('property_id')} or ${elevated}`,
    notifications: `recipient_id=${self} or ${elevated}`,
    saved_rentals: `renter_id=${self}`, tenant_preferences: `renter_id=${self}`,
    maintenance_requests: `requested_by=${self} or assigned_to=${self} or ${tenancyAccess.replace('%s','maintenance_requests.tenancy_id')} or ${manager('property_id')} or ${elevated}`,
    rental_messages: `sender_id=${self} or recipient_id=${self} or ${tenancyAccess.replace('%s','rental_messages.tenancy_id')}`,
    workflow_audit_events: `actor_id=${self} or ${elevated}`,
    viewing_requests: `lower(guest_email)=(select lower(email) from public.profiles where id=${self}) or ${owner('property_id')} or ${manager('property_id')} or ${elevated}`,
    property_manager_assignments: `manager_id=${self} or ${owner('property_id')} or ${elevated}`,
    property_inspections: `manager_id=${self} or ${owner('property_id')} or ${manager('property_id')} or ${elevated}`,
    tenant_complaints: `requested_by=${self} or ${tenancyAccess.replace('%s','tenant_complaints.tenancy_id')} or ${managerPropertyFromTenancy('tenant_complaints.tenancy_id', self)} or ${elevated}`,
    complaint_internal_notes: `author_id=${self} or ${elevated}`,
    property_expenses: `submitted_by=${self} or ${manager('property_id')} or ${owner('property_id')} or ${elevated}`,
    maintenance_activity: `actor_id=${self} or exists(select 1 from public.maintenance_requests m where m.id=maintenance_activity.request_id and (m.assigned_to=${self} or ${manager('m.property_id')} or ${elevated}))`,
    tenancy_requests: `requested_by=${self} or ${tenancyAccess.replace('%s','tenancy_requests.tenancy_id')}`,
  };
  return map[table] || 'false';
}
function ownerForApplication(self) { return `exists(select 1 from public.rental_listings l join public.properties p on p.id=l.property_id where l.id=rental_applications.listing_id and (p.owner_id=${self} or exists(select 1 from public.property_manager_assignments ma where ma.property_id=p.id and ma.manager_id=${self} and ma.status='active'))) `; }
function mapTenancyFromAgreement(appAccess, self) { return `exists(select 1 from public.rental_agreements g where g.id=m.agreement_id and ${appAccess.replace('%s','g.application_id')})`; }
function managerPropertyFromTenancy(tenancyColumn, self) { return `exists(select 1 from public.tenancies tx where tx.id=${tenancyColumn} and exists(select 1 from public.property_manager_assignments ma where ma.property_id=tx.property_id and ma.manager_id=${self} and ma.status='active'))`; }

app.get('/api/data/:table', authenticate, safe(async (req, res) => {
  const table = req.params.table;
  const columns = DATA_TABLES[table];
  if (!columns) return res.status(404).json({ error: 'Unknown data resource' });
  const params = [req.auth.account_id];
  const clauses = [`(${accessPredicate(table, 1)})`];
  for (const [key, raw] of Object.entries(req.query)) {
    if (['select','order','limit','offset'].includes(key)) continue;
    if (!columns.includes(key)) return res.status(400).json({ error: `Unsupported filter: ${key}` });
    const value = String(raw);
    const match = value.match(/^(eq|neq|gt|gte|lt|lte|is)\.(.*)$/);
    if (match) { params.push(match[2]); clauses.push(`${ident(key)} ${({eq:'=',neq:'<>',gt:'>',gte:'>=',lt:'<',lte:'<=',is:'is'})[match[1]]} $${params.length}`); }
    else if (value.startsWith('in.(') && value.endsWith(')')) {
      const values = value.slice(4,-1).split(','); if (!values.length) continue;
      params.push(values); clauses.push(`${ident(key)} = any($${params.length})`);
    } else return res.status(400).json({ error: `Invalid filter for ${key}` });
  }
  const requested = String(req.query.select || '*').split(',').map((part) => part.trim()).filter(Boolean);
  const wantsProperty = table === 'rental_listings' && requested.some((column) => column.startsWith('properties(') || column.startsWith('properties!'));
  const selected = requested.includes('*') || requested.some((column) => column.includes('(') || column.includes('!')) ? columns : requested;
  if (selected.some((column) => !columns.includes(column))) return res.status(400).json({ error: 'Unsupported projection' });
  let order = '';
  if (req.query.order) { const [field, direction='asc'] = String(req.query.order).split('.'); if (!columns.includes(field) || !['asc','desc'].includes(direction.toLowerCase())) return res.status(400).json({ error: 'Invalid sort' }); order = ` order by ${ident(field)} ${direction.toLowerCase()}`; }
  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 200)));
  const offset = Math.max(0, Number(req.query.offset || 0));
  params.push(limit, offset);
  try {
    const propertyProjection = wantsProperty ? ', to_jsonb(prop) as properties' : '';
    const source = wantsProperty ? `public.${ident(table)} join public.properties prop on prop.id=rental_listings.property_id` : `public.${ident(table)}`;
    const result = await pool.query(`select ${selected.map((column) => wantsProperty ? `rental_listings.${ident(column)}` : ident(column)).join(',')}${propertyProjection} from ${source} where ${clauses.join(' and ')}${order} limit $${params.length-1} offset $${params.length}`, params);
    return res.json(result.rows);
  } catch (error) { console.error('Namecheap data read failed', table, error?.code); return res.status(500).json({ error: 'Could not load this data.' }); }
}));

async function hasRole(accountId, roles) {
  const result = await pool.query(`select 1 from public.profile_roles where profile_id=$1 and role::text=any($2::text[]) limit 1`, [accountId, roles]);
  return Boolean(result.rowCount);
}
app.post('/api/workflows/:name', authenticate, safe(async (req, res) => {
  const actor = req.auth.account_id;
  const input = req.body || {};
  let client;
  try {
    client = await pool.connect();
    await client.query('begin');
    if (req.params.name === 'submit-rental-application') {
      const listingId = String(input.listingId || '');
      if (!listingId || !input.desiredMoveIn || !String(input.occupation || '').trim()) throw Object.assign(new Error('Complete the move-in date and occupation.'), { status: 400 });
      const listing = await client.query(`select l.id from public.rental_listings l where l.id=$1 and l.status='published' for update`, [listingId]);
      if (!listing.rowCount) throw Object.assign(new Error('This rental is no longer available.'), { status: 404 });
      const inserted = await client.query(`insert into public.rental_applications(id,listing_id,applicant_id,status,desired_move_in,occupation,message) values($1,$2,$3,'submitted',$4,$5,$6) returning *`, [randomUUID(), listingId, actor, input.desiredMoveIn, String(input.occupation).trim(), String(input.message || '').slice(0,5000)]);
      await client.query(`insert into public.workflow_audit_events(id,actor_id,entity_type,entity_id,action) values($1,$2,'rental_application',$3,'submitted')`, [randomUUID(), actor, inserted.rows[0].id]);
      await client.query('commit'); return res.status(201).json(inserted.rows[0]);
    }
    if (req.params.name === 'approve-application') {
      if (!(await hasRole(actor, ['landlord','admin','super_admin']))) throw Object.assign(new Error('Landlord access is required.'), { status: 403 });
      const applicationId = String(input.applicationId || '');
      const result = await client.query(`select a.*,l.rent_amount_minor,l.deposit_amount_minor,l.currency,l.id as listing_id,p.id as property_id,p.owner_id,p.title,p.address from public.rental_applications a join public.rental_listings l on l.id=a.listing_id join public.properties p on p.id=l.property_id where a.id=$1 for update of a`, [applicationId]);
      const row = result.rows[0];
      if (!row) throw Object.assign(new Error('Application not found.'), { status: 404 });
      const elevated = await hasRole(actor, ['admin','super_admin']);
      if (!elevated && row.owner_id !== actor) throw Object.assign(new Error('You cannot approve applications for this property.'), { status: 403 });
      if (row.status !== 'submitted' && row.status !== 'under_review') throw Object.assign(new Error('Only submitted applications can be approved.'), { status: 409 });
      const endDate = new Date(`${row.desired_move_in}T00:00:00Z`); endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
      await client.query(`update public.rental_applications set status='approved',updated_at=now() where id=$1`, [row.id]);
      const agreementId = randomUUID();
      await client.query(`insert into public.rental_agreements(id,application_id,status,terms,lease_start,lease_end,rent_amount_minor,deposit_amount_minor) values($1,$2,'landlord_review',$3::jsonb,$4,$5,$6,$7) on conflict(application_id) do nothing`, [agreementId,row.id,JSON.stringify({property_title:row.title,property_address:row.address,currency:row.currency}),row.desired_move_in,endDate.toISOString().slice(0,10),row.rent_amount_minor,row.deposit_amount_minor]);
      await client.query(`insert into public.notifications(id,recipient_id,title,body,action_path) values($1,$2,'Application approved','Your application was approved. The landlord will prepare your rental agreement next.','/renter-dashboard')`, [randomUUID(),row.applicant_id]);
      await client.query(`insert into public.workflow_audit_events(id,actor_id,entity_type,entity_id,action) values($1,$2,'rental_application',$3,'approved')`, [randomUUID(),actor,row.id]);
      await client.query('commit'); return res.json({ applicationId: row.id, status: 'approved' });
    }
    throw Object.assign(new Error('This workflow is not available on the Namecheap API yet.'), { status: 501 });
  } catch (error) {
    await client?.query('rollback').catch(() => {});
    if (error?.code === '23505') return res.status(409).json({ error: 'An active application or agreement already exists.' });
    if (!error.status) console.error('Workflow failed:', req.params.name, error?.code, error?.message);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'The workflow could not be completed.' });
  } finally { client?.release(); }
}));

app.get(/^\/(?:[^/]+\/?)?$/, async (_req, res) => {
  if (!pool) return res.status(503).json({ service: 'Aurelia Homes API', status: 'not_configured', database: 'not_configured' });
  try {
    await pool.query('select 1');
    return res.json({ service: 'Aurelia Homes API', status: 'ok', database: 'connected' });
  } catch {
    return res.status(503).json({ service: 'Aurelia Homes API', status: 'degraded', database: 'unavailable' });
  }
});

app.get(/\/api\/health\/?$/, async (_req, res) => {
  if (!pool) return res.status(503).json({ status: 'not_configured', database: 'not_configured' });
  try {
    await pool.query('select 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch {
    return res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.use((req, res) => {
  if (/\/api(?:\/|$)/.test(req.path)) return res.status(404).json({ error: 'API route not implemented' });
  return res.status(404).json({ error: 'Route not found' });
});

app.use((error, _req, res, _next) => {
  if (error?.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'This website is not allowed to call the API. Add its address to APP_ORIGINS.' });
  }
  console.error('Unhandled route error:', error?.code, error?.message);
  return res.status(500).json({ error: 'Something went wrong on the server.' });
});

// Passenger supplies the port and socket for cPanel Node.js applications.
// Do not bind to a fixed host/interface on shared hosting.
app.listen(port, () => {
  console.log(`Aurelia API listening on port ${port}`);
});

process.on('SIGTERM', async () => {
  await pool?.end();
  process.exit(0);
});