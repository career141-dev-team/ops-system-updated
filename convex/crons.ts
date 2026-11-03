import { cronJobs, makeFunctionReference } from "convex/server";

/**
 * Everything that happens without anybody asking (15, Phase 1 step 19).
 *
 * Five minutes is the gap because the shortest thing we promise anyone is
 * counted in hours - the agreement chase, the feedback chase - so being up to
 * five minutes late is invisible, and the app is asked twelve times an hour
 * rather than every minute for nothing.
 *
 * Referenced by name rather than through the generated api, which is only
 * regenerated when the backend is running.
 */
const crons = cronJobs();

crons.interval(
  "ops clocks",
  { minutes: 5 },
  makeFunctionReference<"action">("ops/clock:askTheApp"),
  {},
);

export default crons;
