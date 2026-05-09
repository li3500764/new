import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const cwd = process.cwd();
  const distDir = ".next";
  const manifestPath = path.join(cwd, distDir, "server", "server-reference-manifest.json");

  let manifestExists = false;
  let manifestContent = null;
  let manifestError = null;
  let manifestNodeKeys: string[] = [];

  try {
    manifestExists = fs.existsSync(manifestPath);
    if (manifestExists) {
      manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      manifestNodeKeys = Object.keys(manifestContent?.node || {});
    }
  } catch (e: any) {
    manifestError = e.message;
  }

  const requiredServerFilesPath = path.join(cwd, distDir, "required-server-files.json");
  let requiredServerFilesConfig: any = null;
  try {
    if (fs.existsSync(requiredServerFilesPath)) {
      requiredServerFilesConfig = JSON.parse(fs.readFileSync(requiredServerFilesPath, "utf8")).config;
    }
  } catch {}

  return NextResponse.json({
    cwd,
    distDir,
    manifestPath,
    manifestExists,
    manifestError,
    manifestNodeKeys,
    manifestNodeCount: manifestNodeKeys.length,
    envSiteUrl: process.env.SITE_URL,
    envNodeEnv: process.env.NODE_ENV,
    envStandaloneConfig: process.env.__NEXT_PRIVATE_STANDALONE_CONFIG ? "set" : "not set",
    requiredServerFilesDistDir: requiredServerFilesConfig?.distDir,
  });
}
