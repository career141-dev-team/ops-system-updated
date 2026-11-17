import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The demo keeps nothing between requests on the Worker (no incremental cache, no queue): every page here is
// rendered on demand, and the data is the invented sample data.
export default defineCloudflareConfig();
