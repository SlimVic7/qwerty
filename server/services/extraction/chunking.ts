export function chunkText(text: string, maxChunkLength: number = 15000): string[] {
  if (text.length <= maxChunkLength) return [text];

  const chunks: string[] = [];
  let currentStart = 0;

  while (currentStart < text.length) {
    if (currentStart + maxChunkLength >= text.length) {
      chunks.push(text.slice(currentStart));
      break;
    }

    // Try to find a good breaking point (double newline) within the last 20% of the chunk
    const searchAreaStart = currentStart + Math.floor(maxChunkLength * 0.8);
    const searchAreaEnd = currentStart + maxChunkLength;
    const searchArea = text.slice(searchAreaStart, searchAreaEnd);
    
    let breakPoint = searchArea.lastIndexOf('\n\n');
    
    if (breakPoint !== -1) {
      breakPoint = searchAreaStart + breakPoint;
    } else {
      // Fallback to single newline
      breakPoint = searchArea.lastIndexOf('\n');
      if (breakPoint !== -1) {
        breakPoint = searchAreaStart + breakPoint;
      } else {
        // Hard break
        breakPoint = searchAreaEnd;
      }
    }

    chunks.push(text.slice(currentStart, breakPoint).trim());
    currentStart = breakPoint;
    
    // Skip whitespace at the beginning of the next chunk
    while (currentStart < text.length && /\s/.test(text[currentStart])) {
      currentStart++;
    }
  }

  return chunks.filter(c => c.length > 0);
}
