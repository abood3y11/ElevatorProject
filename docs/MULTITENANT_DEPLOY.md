# Multi-tenant cutover — deployment runbook

The one-time deploy that turns ELMS from a single-company system into a
multi-tenant SaaS. It is not a routine deploy and it should not be run like one.

Companion docs: [`VPS_OPERATIONS_GUIDE.md`](VPS_OPERATIONS_GUIDE.md) (production),
[`VPS_OPT_02.md`](VPS_OPT_02.md) (the test box).

---

## 1. What actually changes

* `company_id` is added to **117 tables**, and every existing row is stamped with
  company #1 — the business running today. Nothing about how they work changes.
* Row-level security is enabled and **forced** on those 117 tables.
* A new non-superuser database role, `elms_app`, is created. **The application
  connects as this role from now on; alembic keeps connecting as `postgres`.**
* Three new tables — `companies`, `plans`, `subscriptions` — plus the platform
  console at `/platform`.

## 2. The one thing that can go silently wrong

A PostgreSQL **superuser bypasses every row-level security policy
unconditionally**, and `FORCE ROW LEVEL SECURITY` only binds the table *owner*.
The application currently connects as `postgres`.

So if the code ships without `APP_DATABASE_URL` pointing at `elms_app`:

* every page still works,
* the policies exist and look enabled in `pg_policies`,
* and **every company can read every other company's data**.

There is no error, no warning in the UI, and nothing in the logs except the
fallback banner `config.py` prints at startup. The deploy script checks for that
banner and refuses to report success if it appears. Do not skip that check.

## 3. Order

```
1. back up
2. migrate                 old code keeps serving: it never mentions company_id,
                           and the column default fills it in
3. create elms_app + set APP_DATABASE_URL
4. build, restart, verify
```

Step 4 before step 2 is an outage — the new models declare a column that would
not exist yet. Step 2 without step 3 is the silent failure in §2.

Between steps 2 and 3 the system is in a safe intermediate state: the schema is
new, the app is still on `postgres`, RLS is inert, and everything behaves exactly
as it did before. It is fine to stop there and continue later.

## 4. Running it

**Rehearse on the test box first** (`31.220.111.147`, mock data, no WhatsApp, no
S3, no TLS — see `VPS_OPT_02.md`). The script is identical on both boxes.

```bash
ssh root@<host>
cd /opt/elms/server-ELMS
git pull --ff-only

export DATABASE_URL='postgresql://postgres:<pw>@<db-host>:5432/elms_db'

bash scripts/deploy_multitenant.sh --check    # inspect, change nothing
bash scripts/deploy_multitenant.sh            # do it
```

`--check` prints the table count, row count, how many `company_id` columns and
RLS policies already exist, whether the role exists and whether
`APP_DATABASE_URL` is set. Run it first, every time. The script is idempotent —
re-running it after a partial failure resumes rather than repeating.

### docker-compose

The containers need the new variable. Add to **both** the `api` and `worker`
service environment blocks:

```yaml
      APP_DATABASE_URL: ${APP_DATABASE_URL}
```

The script appends `APP_DATABASE_URL=…` to `/opt/elms/.env` and warns if
`docker-compose.yml` does not pass it through. **That warning means the cutover
is not finished**, however green everything else looks.

### The password

Generated once and printed once. Store it in the password manager. It is not
recoverable — only re-settable, by re-running
`python3 scripts/setup_tenant_role.py` with a new `ELMS_APP_DB_PASSWORD` and
updating `APP_DATABASE_URL` to match.

## 5. Verifying by hand

```sql
-- expect ~117 for all three
SELECT count(*) FROM information_schema.columns
  WHERE table_schema='public' AND column_name='company_id';
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relforcerowsecurity;
SELECT count(*) FROM pg_policies WHERE schemaname='public';

-- must both be false, or the isolation is theatre
SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname='elms_app';
```

Then, in the browser: **log in as a normal user and confirm the customer list
shows the same count it showed before the deploy.** If it shows zero, the
company is not reaching the database session — roll back.

## 6. Rolling back

The script writes a `pg_dump` to `/opt/elms/backups/` and prints the path.

```bash
# 1. put the old code back
cd /opt/elms/server-ELMS && git checkout <previous-sha>
# 2. restore the schema and data
pg_restore -d "$DATABASE_URL" --clean --if-exists /opt/elms/backups/<dump>
# 3. remove APP_DATABASE_URL from /opt/elms/.env
# 4. rebuild
cd /opt/elms && docker compose build api worker && docker compose up -d api worker
```

A faster partial rollback, if the schema is fine and only the isolation is
misbehaving: comment out `APP_DATABASE_URL` and restart. The app returns to
connecting as `postgres`, RLS goes inert, and the system behaves exactly as it
did before the cutover — with the new schema still in place.

## 7. After the cutover

* Nothing is billed automatically. Subscriptions and plan limits are enforced,
  but collection is manual: issue the invoice outside the system and use
  «إيقاف» / «تفعيل» in the platform console to control access.
* Subdomains per company are **deferred**. Sign-in stays on one address and the
  company is resolved from the authenticated user, which is what the code does
  today. Wildcard DNS and a wildcard certificate are only needed when
  `company.<domain>` goes live.
* The platform console is at `/platform`, visible only to a user whose
  `users.is_platform_admin` is true. Set it on your own account first:

```sql
UPDATE users SET is_platform_admin = true WHERE email = '<your email>';
```
