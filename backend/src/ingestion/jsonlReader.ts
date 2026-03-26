import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

export interface DatasetFile {
  folder: string;
  path: string;
}

async function walkJsonlFiles(root: string): Promise<DatasetFile[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: DatasetFile[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      const nested = await walkJsonlFiles(absolutePath);
      files.push(...nested);
      continue;
    }

    if (entry.isFile() && absolutePath.endsWith(".jsonl")) {
      files.push({
        folder: path.basename(path.dirname(absolutePath)),
        path: absolutePath
      });
    }
  }

  return files;
}

export async function listDatasetFiles(root: string): Promise<DatasetFile[]> {
  const files = await walkJsonlFiles(root);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

export async function* readJsonlRows(
  filePath: string
): AsyncGenerator<Record<string, unknown>> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    yield JSON.parse(trimmed) as Record<string, unknown>;
  }
}
