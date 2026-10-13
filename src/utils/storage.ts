import { get, set, del, keys } from 'idb-keyval';
import type { DocItem } from '../types';

const DOC_PREFIX = 'noteflow_doc_';

export async function saveDocument(doc: DocItem): Promise<void> {
  const updatedDoc = {
    ...doc,
    updatedAt: Date.now(),
  };
  await set(`${DOC_PREFIX}${doc.id}`, updatedDoc);
}

export async function getDocument(id: string): Promise<DocItem | undefined> {
  return await get<DocItem>(`${DOC_PREFIX}${id}`);
}

export async function getAllDocuments(): Promise<DocItem[]> {
  const allKeys = await keys();
  const docKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(DOC_PREFIX));
  const docs: DocItem[] = [];

  for (const k of docKeys) {
    const item = await get<DocItem>(k);
    if (item) {
      docs.push(item);
    }
  }

  // Sort by latest updated
  return docs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteDocument(id: string): Promise<void> {
  await del(`${DOC_PREFIX}${id}`);
}
