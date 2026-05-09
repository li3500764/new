import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type RequiredServerFiles = {
  config?: {
    distDir?: string;
  };
};

export async function GET() {
  const cwd = process.cwd();
  const distDir = ".next";
  const manifestPath = path.join(cwd, distDir, "server", "server-reference-manifest.json");

  let manifestExists = false;
  let manifestError: string | null = null;
  let manifestNodeKeys: string[] = [];

  try {
    manifestExists = fs.existsSync(manifestPath);
    if (manifestExists) {
      const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
        node?: Record<string, unknown>;
      };
      manifestNodeKeys = Object.keys(manifestContent?.node || {});
    }
  } catch (error) {
    manifestError = error instanceof Error ? error.message : "Unknown manifest read error";
  }

  const requiredServerFilesPath = path.join(cwd, distDir, "required-server-files.json");
  let requiredServerFilesConfig: RequiredServerFiles["config"] | null = null;
  try {
    if (fs.existsSync(requiredServerFilesPath)) {
      requiredServerFilesConfig = (
        JSON.parse(fs.readFileSync(requiredServerFilesPath, "utf8")) as RequiredServerFiles
      ).config ?? null;
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
