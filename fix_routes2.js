import fs from 'fs';
let content = fs.readFileSync('server/routes/jobImports.ts', 'utf-8');

// 1. Remove reviewed_by and reviewed_at from updates
content = content.replace("updates.reviewed_by = req.user!.id;\n        updates.reviewed_at = new Date().toISOString();", "");

// 2. Map the RPC exceptions in PATCH /items/:id
const catchBlockOriginal = `  } catch (error: any) {
    console.error("PATCH error:", error);
    res.status(500).json({ message: 'Internal server error' });
  }`;

const catchBlockNew = `  } catch (error: any) {
    console.error("PATCH error:", error.message || error);
    const msg = error.message || '';
    if (msg.includes('INCONSISTENT_STATUS')) {
        return res.status(400).json({ message: 'INCONSISTENT_STATUS' });
    }
    if (msg.includes('UNSUPPORTED_UPDATE_FIELD')) {
        return res.status(400).json({ message: 'UNSUPPORTED_UPDATE_FIELD' });
    }
    if (msg.includes('INVALID_UPDATES_FORMAT') || msg.includes('INVALID_ACTION')) {
        return res.status(400).json({ message: 'INVALID_REQUEST' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }`;

content = content.replace(catchBlockOriginal, catchBlockNew);

fs.writeFileSync('server/routes/jobImports.ts', content);
