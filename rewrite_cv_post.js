import fs from 'fs';
let ts = fs.readFileSync('server/routes/candidate.ts', 'utf-8');

const startIndex = ts.indexOf("candidateRouter.post('/cvs'");
const endIndex = ts.indexOf("candidateRouter.get('/cvs/:id/access'");

const originalCode = ts.substring(startIndex, endIndex);

const correctCode = `candidateRouter.post('/cvs', upload.single('cvFile'), async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file format. Only PDF, DOC, and DOCX are allowed.' });
    }

    // Validate extension
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ message: 'Invalid file extension. Only .pdf, .doc, and .docx are allowed.' });
    }

    // Validate size (redundant with multer limit but safe to explicitly check)
    if (file.size > 5 * 1024 * 1024) { 
      return res.status(400).json({ message: 'File exceeds 5MB limit.' });
    }

    // Magic Bytes Validation
    const magic = validateMagicBytes(file.buffer);
    if (!magic.valid) {
      return res.status(400).json({ message: 'Invalid file signature. File appears corrupted or disguised.' });
    }

    const cvId = uuidv4();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = \`\${userId}/\${cvId}/\${sanitizedFilename}\`;

    // 1. Upload to Supabase Storage using service role
    const { error: uploadError } = await supabase.storage
      .from('candidate-cvs')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload file securely' });
    }

    // 2. Database changes via atomic RPC
    const { data: newCv, error: insertError } = await supabase.rpc('candidate_add_cv_version', {
      p_user_id: userId,
      p_storage_path: storagePath,
      p_original_filename: file.originalname,
      p_mime_type: file.mimetype,
      p_file_size_bytes: file.size
    });

    if (insertError) {
      // Compensation: Rollback storage if DB fails
      console.error('[METADATA_RPC] Database insert error, rolling back storage:', JSON.stringify(insertError, null, 2));
      await supabase.storage.from('candidate-cvs').remove([storagePath]);
      return res.status(500).json({ message: 'Failed to save CV record' });
    }

    res.status(201).json(newCv);
  } catch (error: any) {
    console.error('CV Upload Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

`;

ts = ts.replace(originalCode, correctCode);
fs.writeFileSync('server/routes/candidate.ts', ts);
