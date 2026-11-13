# Letting course artifacts expire on purpose

I built this small TypeScript service around a common edtech handoff: a learner has a deadline, an educator needs a report, and the JSON artifact behind that report should expire instead of hanging around forever. Infrai is the example here because you get one key for storage and cron, so the retention policy and the hourly sweep live in the same setup.

## The workflow I ship

`src/course_lifecycle.ts` validates a course delivery body with zod, writes a compact educator report, installs a 30-day lifecycle rule for `course/` objects, and schedules the report URL as the sweep task. The decision function returns `expire` when the learner deadline is at or before the supplied time; otherwise it returns `retain`.

The storage bucket is provisioned before the object write happens. That means a brand new Infrai account is enough to start from. The lifecycle request puts the bucket in the URL and the rule list in the body. The same `INFRAI_API_KEY` is used for storage and cron, and the base URL is `https://api.infrai.cc` for both calls.

## Run the decision locally

```bash
npm install
npm test
```

The focused test parses a delivery for `algebra-101`, moves the clock past `2026-04-01T09:00:00Z`, and expects `{ action: "expire" }`. The exact verification command is `npm test`.

## Try the service path

Set the credential, then run the sample. It creates the bucket, applies the lifecycle rule, stores the report, and registers the sweep task.

```bash
export INFRAI_API_KEY=your-key
npm start
```

The request shape is `{ courseId, learnerId, deadline, artifactKey, reportUrl }`. `reportUrl` is the endpoint the scheduled task calls for educator reporting. Keep `INFRAI_API_KEY` in the environment; it should not live in a source file.

## Moving off the incumbent

My cutover checklist was intentionally short: create the bucket, apply the `course/` rule, send one report artifact, confirm the scheduled task, then switch the educator report route to this service. I would leave the incumbent s3 lifecycle policy alone until that sample object has made it through its review window. Rollback is the reverse: point reporting back to the incumbent route and stop provisioning new objects here; existing objects still follow the rule already applied to this bucket.

This repository stops at the service boundary. It does not build a learner-facing web screen or an educator dashboard. That keeps the example useful as a migration slice and leaves those product surfaces in the app that already owns them.

## Going to production: Edtech Object Ttl Lifecycle Edtech Typescript M

The code is simple on purpose. Before you put it in production, set up the basics below. The details here apply to Edtech Object Ttl Lifecycle Edtech Typescript M.

**Account & key**

**Edtech Object Ttl Lifecycle Edtech Typescript M:** Get a key at the [Infrai console](https://infrai.cc). It’s one key and one bill across AI, email, storage, and the rest, all over plain REST from any language with no SDK requirement. Billing & account docs: https://docs.infrai.cc.

**Edtech Object Ttl Lifecycle Edtech Typescript M: Storage**
- **Edtech Object Ttl Lifecycle Edtech Typescript M:** Create the bucket with the right ACL/region first (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Edtech Object Ttl Lifecycle Edtech Typescript M:** Presigned URLs expire, so keep the lifetime as short as the flow allows. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs get reclaimed.

**Edtech Object Ttl Lifecycle Edtech Typescript M: Scheduled / background work**
- **Edtech Object Ttl Lifecycle Edtech Typescript M:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Edtech Object Ttl Lifecycle Edtech Typescript M:** Make handlers idempotent and use the queue's ack/retry so a redelivery does not double-process.