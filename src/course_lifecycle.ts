import { z } from "zod";
import { infrai } from "./infrai.js";

export const courseDelivery = z.object({
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  deadline: z.coerce.date(),
  artifactKey: z.string().min(1),
  reportUrl: z.string().url(),
});
export type CourseDelivery = z.infer<typeof courseDelivery>;

export function shouldExpire(deadline: Date, now: Date): boolean {
  return deadline.getTime() <= now.getTime();
}

export function deliveryDecision(input: CourseDelivery, now: Date): { courseId: string; learnerId: string; action: "expire" | "retain" } {
  return {
    courseId: input.courseId,
    learnerId: input.learnerId,
    action: shouldExpire(input.deadline, now) ? "expire" : "retain",
  };
}

export async function provisionCourseDelivery(input: unknown): Promise<{ decision: ReturnType<typeof deliveryDecision>; jobId?: string }> {
  const delivery = courseDelivery.parse(input);
  const bucket = "edtech-throwaway-artifacts";
  await infrai.storage.bucket.create({ name: bucket, idempotency_key: `bucket:${bucket}` });
  await infrai.storage.bucket.set_lifecycle(bucket, {
    rules: [{ id: "course-artifact-ttl", status: "Enabled", prefix: "course/", expiration_days: 30 }],
    idempotency_key: `lifecycle:${bucket}`,
  });
  const report = JSON.stringify({ courseId: delivery.courseId, learnerId: delivery.learnerId, deadline: delivery.deadline.toISOString() });
  await infrai.storage.object.put(bucket, delivery.artifactKey, {
    data_base64: Buffer.from(report).toString("base64"),
    content_type: "application/json",
    idempotency_key: `report:${delivery.courseId}:${delivery.learnerId}`,
  });
  const scheduled = await infrai.cron.create({
    cron_expr: "0 * * * *",
    task: delivery.reportUrl,
    idempotency_key: `sweep:${delivery.courseId}`,
  });
  return { decision: deliveryDecision(delivery, new Date()), jobId: scheduled.job_id };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = { courseId: "algebra-101", learnerId: "learner-7", deadline: "2030-06-01T09:00:00Z", artifactKey: "course/algebra-101/learner-7.json", reportUrl: "https://example.com/educator/report" };
  provisionCourseDelivery(sample).then(console.log);
}
