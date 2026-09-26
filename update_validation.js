import fs from 'fs';
let ts = fs.readFileSync('server/routes/candidate.ts', 'utf-8');

const newValidation = `function validateMagicBytes(buffer: Buffer): { valid: boolean, format: string | null } {
  if (buffer.length < 8) return { valid: false, format: null };
  
  // PDF: %PDF- (25 50 44 46 2D)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2D) {
    return { valid: true, format: 'pdf' };
  }
  
  // DOC (OLE Compound File): D0 CF 11 E0 A1 B1 1A E1
  if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 && 
      buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1) {
    return { valid: true, format: 'doc' };
  }
  
  // DOCX / ZIP: PK\\x03\\x04 (50 4B 03 04)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    // To distinguish DOCX from a generic ZIP, we check for common Office OpenXML strings
    // within the first few KB of the file.
    const searchArea = buffer.subarray(0, Math.min(buffer.length, 8192)).toString('ascii');
    if (searchArea.includes('[Content_Types].xml') || searchArea.includes('word/')) {
      return { valid: true, format: 'docx' };
    }
  }
  
  return { valid: false, format: null };
}`;

ts = ts.replace(/function validateMagicBytes[\s\S]*?return \{ valid: false, format: null \};\n\}/, newValidation);

// Also check multer config
if (!ts.includes('limits: {')) {
  // Let's replace const upload = multer({ storage: multer.memoryStorage() });
  ts = ts.replace(
    'const upload = multer({ storage: multer.memoryStorage() });',
    'const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });'
  );
} else {
  // Ensure we have correct limits
  ts = ts.replace(/limits:\s*\{[^}]*\}/, "limits: { fileSize: 5 * 1024 * 1024, files: 1 }");
}

fs.writeFileSync('server/routes/candidate.ts', ts);
