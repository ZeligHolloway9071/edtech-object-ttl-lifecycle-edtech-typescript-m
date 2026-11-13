import assert from "node:assert/strict";
import { courseDelivery, deliveryDecision } from "./course_lifecycle.js";

const input = courseDelivery.parse({
  courseId: "algebra-101",
  learnerId: "learner-7",
  deadline: "2026-04-01T09:00:00Z",
  artifactKey: "course/algebra-101/learner-7.json",
  reportUrl: "https://example.com/educator/report",
});
assert.deepEqual(deliveryDecision(input, new Date("2026-04-02T09:00:00Z")), {
  courseId: "algebra-101",
  learnerId: "learner-7",
  action: "expire",
});
console.log("course deadline decision: expire");
