import JSZip from "jszip";

export interface CleanupResult {
  orphanedFiles: string[];
  removedCount: number;
  originalSize: number;
  cleanedSize: number;
}

/**
 * Scan all .rels files in the PPTX ZIP to find referenced media files.
 */
async function getReferencedMedia(zip: JSZip): Promise<Set<string>> {
  const referencedMedia = new Set<string>();
  const relsFiles = zip.file(/\.rels$/);

  for (const relsFile of relsFiles) {
    const content = await relsFile.async("string");
    // Match both relative and absolute media references
    const matches = content.matchAll(/Target="[^"]*?media\/([^"]+)"/g);
    for (const m of matches) {
      referencedMedia.add("ppt/media/" + m[1]);
    }
    // Also handle targets with ../ prefix
    const relativeMatches = content.matchAll(
      /Target="\.\.\/media\/([^"]+)"/g
    );
    for (const m of relativeMatches) {
      referencedMedia.add("ppt/media/" + m[1]);
    }
  }

  return referencedMedia;
}

/**
 * Remove orphaned media files from a PPTX ZIP and return cleanup stats.
 */
export async function cleanOrphanedMedia(
  zip: JSZip
): Promise<CleanupResult> {
  const referencedMedia = await getReferencedMedia(zip);
  const allMedia = zip.file(/^ppt\/media\//);
  const orphanedFiles: string[] = [];

  for (const file of allMedia) {
    if (!referencedMedia.has(file.name)) {
      orphanedFiles.push(file.name);
      zip.remove(file.name);
    }
  }

  return {
    orphanedFiles,
    removedCount: orphanedFiles.length,
    originalSize: 0, // Filled in by caller
    cleanedSize: 0,
  };
}

/**
 * Strip metadata from docProps/core.xml (author, dates, etc.)
 */
export async function stripMetadata(zip: JSZip): Promise<boolean> {
  const coreXml = zip.file("docProps/core.xml");
  if (!coreXml) return false;

  let content = await coreXml.async("string");

  // Remove creator, lastModifiedBy, revision
  content = content.replace(
    /<dc:creator>[^<]*<\/dc:creator>/g,
    "<dc:creator></dc:creator>"
  );
  content = content.replace(
    /<cp:lastModifiedBy>[^<]*<\/cp:lastModifiedBy>/g,
    "<cp:lastModifiedBy></cp:lastModifiedBy>"
  );
  content = content.replace(
    /<cp:revision>[^<]*<\/cp:revision>/g,
    "<cp:revision>1</cp:revision>"
  );

  zip.file("docProps/core.xml", content);
  return true;
}
