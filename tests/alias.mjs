/** Teaches the test runner the `@/...` alias the app's TypeScript uses. */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./alias-hook.mjs", import.meta.url), pathToFileURL("./"));
