import "server-only";

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * A Word document as a PDF (15, Phase 1 step 23; Part F5).
 *
 * The agreement, the invoice and the offer letter are Word templates with
 * blanks in them; what goes to a client has to be a PDF, because a Word file
 * can be edited by anybody who receives it and because it does not look the
 * same on two machines. LibreOffice does the conversion, exactly as the TA
 * System does it for Word CVs (`src/lib/wordToPdf.ts`), and the Ops server
 * image gets the same LibreOffice.
 *
 * One at a time: two LibreOffice runs sharing a profile fail each other, which
 * the TA System learned on 1 October. A run past sixty seconds is killed with
 * everything it started, because LibreOffice's worker can outlive its
 * launcher and then hold the profile.
 *
 * It never throws. A laptop without LibreOffice is the normal case while we
 * build, so "not installed here" is an answer the screen can show rather than
 * a crash.
 */

const SOFFICE = process.env.SOFFICE_PATH || "soffice";
const TIMEOUT_MS = 60_000;
const PROFILE = pathToFileURL(path.join(os.tmpdir(), "c141-ops-lo-profile")).href;

export interface PdfResult {
  ok: boolean;
  bytes: Uint8Array | null;
  reason: string | null;
}

let busy: Promise<unknown> = Promise.resolve();

export async function docxToPdf(bytes: Uint8Array, name: string): Promise<PdfResult> {
  const mine = busy.then(() => convert(bytes, name));
  // The queue must not break on a failed conversion, so it waits on a
  // promise that cannot reject.
  busy = mine.catch(() => undefined);
  return mine;
}

async function convert(bytes: Uint8Array, name: string): Promise<PdfResult> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c141-ops-pdf-"));
  const source = path.join(dir, name.replace(/[^A-Za-z0-9.\-_]+/g, "-") || "document.docx");
  try {
    fs.writeFileSync(source, bytes);
    const ran = await soffice(["--headless", "--norestore", "--nolockcheck", "-env:UserInstallation=" + PROFILE, "--convert-to", "pdf", "--outdir", dir, source]);
    if (ran) return { ok: false, bytes: null, reason: ran };
    const made = fs.readdirSync(dir).find((f) => f.toLowerCase().endsWith(".pdf"));
    if (!made) return { ok: false, bytes: null, reason: "LibreOffice ran but made no PDF." };
    return { ok: true, bytes: fs.readFileSync(path.join(dir, made)), reason: null };
  } catch (error) {
    return { ok: false, bytes: null, reason: error instanceof Error ? error.message : "The conversion failed." };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Nothing on failure means it worked; a sentence means it did not. */
function soffice(args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(SOFFICE, args, { detached: process.platform !== "win32", stdio: "ignore" });
    const timer = setTimeout(() => {
      try {
        if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {
        // It had already gone.
      }
      resolve("LibreOffice took longer than " + TIMEOUT_MS / 1000 + " seconds.");
    }, TIMEOUT_MS);
    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      resolve(
        error.code === "ENOENT"
          ? "LibreOffice is not installed on this machine, so no PDF can be made here. The server has it."
          : "LibreOffice could not be started: " + error.message,
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? null : "LibreOffice stopped with code " + code + ".");
    });
  });
}
