import fs from 'fs';
let content = fs.readFileSync('server/routes/jobImports.ts', 'utf-8');

// Also catch INVALID_ACTION
if (content.includes('INVALID_ACTION')) {
    // already there?
} else {
    content = content.replace("if (msg.includes('INVALID_UPDATES_FORMAT'))", "if (msg.includes('INVALID_UPDATES_FORMAT') || msg.includes('INVALID_ACTION'))");
}

if (!content.includes('updates.duplicate_of_job_id = req.body.duplicate_of_job_id')) {
    content = content.replace(
        "updates.review_status = 'duplicate';\n        auditAction = 'marked_duplicate';",
        "updates.review_status = 'duplicate';\n        if (req.body.duplicate_of_job_id) updates.duplicate_of_job_id = req.body.duplicate_of_job_id;\n        auditAction = 'marked_duplicate';"
    );
}
fs.writeFileSync('server/routes/jobImports.ts', content);
