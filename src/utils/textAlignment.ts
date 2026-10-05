export interface AlignedParagraph {
  target: string;
  source: string;
}

interface SegmentResult {
  paragraphs: string[];
  lines: string[];
}

export function extractSegments(text: string): SegmentResult {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const paragraphs = normalized ? normalized.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) : [];
  const lines = normalized ? normalized.split('\n').map((s) => s.trim()).filter(Boolean) : [];
  return { paragraphs, lines };
}

export function splitTextSegments(text: string): string[] {
  const { paragraphs, lines } = extractSegments(text);
  return paragraphs.length > 1 ? paragraphs : lines;
}

export function alignBilingualParagraphs(
  targetText: string,
  sourceText = ''
): AlignedParagraph[] {
  const target = extractSegments(targetText);
  const source = extractSegments(sourceText);

  let targetList = target.paragraphs;
  let sourceList = source.paragraphs;

  const bothHaveMultipleParagraphs = target.paragraphs.length > 1 && source.paragraphs.length > 1;
  if (!bothHaveMultipleParagraphs && target.lines.length === source.lines.length) {
    targetList = target.lines;
    sourceList = source.lines;
  }

  const maxLen = Math.max(targetList.length, sourceList.length);
  const result: AlignedParagraph[] = [];
  for (let i = 0; i < maxLen; i++) {
    result.push({
      target: targetList[i] ?? '',
      source: sourceList[i] ?? '',
    });
  }
  return result;
}
