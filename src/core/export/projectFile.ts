import type { SerializedState } from '../serialize';

/**
 * EPRson project file (.eprson) — a proprietary, versioned JSON format for saving/loading
 * a full debugger session to/from the user's filesystem: source, seed, measurement mode and
 * breakpoints. Distinct from the compact base64 blob used for shareable URLs (core/serialize.ts);
 * this one is meant to be a readable, portable file a user actually saves and re-opens.
 */

export const PROJECT_FILE_EXTENSION = 'eprson';
export const PROJECT_MIME_TYPE = 'application/vnd.eprson.circuit+json';

const FORMAT_TAG = 'eprson-circuit';
const FORMAT_VERSION = 1;

interface ProjectFileV1 {
  format: typeof FORMAT_TAG;
  version: typeof FORMAT_VERSION;
  source: string;
  seed: number;
  measurementMode: SerializedState['measurementMode'];
  breakpoints: number[];
  exampleId?: string;
}

export function serializeProjectFile(state: SerializedState): string {
  const doc: ProjectFileV1 = {
    format: FORMAT_TAG,
    version: FORMAT_VERSION,
    source: state.source,
    seed: state.seed,
    measurementMode: state.measurementMode,
    breakpoints: state.breakpoints,
    exampleId: state.exampleId,
  };
  return JSON.stringify(doc, null, 2);
}

export function parseProjectFile(text: string): SerializedState | null {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof obj !== 'object' || obj === null) return null;
  const doc = obj as Partial<ProjectFileV1>;
  if (doc.format !== FORMAT_TAG) return null;
  if (typeof doc.source !== 'string') return null;
  return {
    source: doc.source,
    seed: typeof doc.seed === 'number' ? doc.seed : 1337,
    measurementMode: doc.measurementMode ?? 'SAMPLE',
    breakpoints: Array.isArray(doc.breakpoints) ? doc.breakpoints : [],
    exampleId: doc.exampleId,
  };
}
