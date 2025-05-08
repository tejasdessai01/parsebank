import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import * as pdf from 'pdf-parse';
import ExcelJS from 'exceljs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const form = new IncomingForm({
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err || !files.file) {
      console.error('Form error:', err);
      return res.status(400).json({ message: 'Invalid file upload' });
    }

    try {
      const uploaded = files.file[0];
      const buffer = fs.readFileSync(uploaded.filepath);

      const result = await pdf(buffer);
      const text = result.text;

      if (!/account|transaction|statement|balance/i.test(text)) {
        return res.status(400).json({ message: 'This does not appear to be a bank statement.' });
      }

      const lines = text.split('\n');
      const rows: { date: string; description: string; amount: string }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Pattern 1: MM-DD Description $Amount
        const pattern1 = line.match(/(\d{2}-\d{2})\s+(.{5,}?)\s+\$?(-?\d{1,3}(?:,?\d{3})*(?:\.\d{2}))/);
        if (pattern1) {
          const [, date, desc, amt] = pattern1;
          rows.push({ date, description: desc.trim(), amount: amt });
          continue;
        }

        // Pattern 2: MM-DD only, with amount at end, description above or below
        const pattern2 = line.match(/(\d{2}-\d{2}).*?(\$?-?\d{1,3}(?:,?\d{3})*(?:\.\d{2}))/);
        if (pattern2) {
          const [, date, amt] = pattern2;
          const prevLine = i > 0 ? lines[i - 1].trim() : '';
          const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
          const contextDesc = prevLine.length > 5 ? prevLine : nextLine;
          rows.push({ date, description: contextDesc, amount: amt });
          continue;
        }

        // Pattern 3: Check format (date check# amount)
        const pattern3 = line.match(/(\d{2}-\d{2})\s+(\d{3,6})\s+\$?(-?\d+[.,]\d{2})/);
        if (pattern3) {
          const [, date, checkNo, amt] = pattern3;
          rows.push({ date, description: `Check ${checkNo}`, amount: amt });
          continue;
        }

        // Pattern 4: Fallback — any line with $Amount and date-like string
        const fallback = line.match(/(\d{2}[\/\-]\d{2}(?:[\/\-]\d{2,4})?).*?(\$?-?\d+[.,]\d{2})/);
        if (fallback) {
          const [, date, amt] = fallback;
          const desc = line.replace(date, '').replace(amt, '').trim();
          rows.push({ date, description: desc, amount: amt });
        }
      }

      if (rows.length === 0) {
        return res.status(400).json({ message: 'No transactions found. Please try another file.' });
      }

      console.log('Extracted rows:', rows);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Statement');

      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Amount', key: 'amount', width: 15 },
      ];

      rows.forEach(row => sheet.addRow(row));

      const filename = `statement_${Date.now()}.xlsx`;
      const filePath = path.join(process.cwd(), 'public', 'downloads', filename);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      await workbook.xlsx.writeFile(filePath);

      return res.status(200).json({ downloadUrl: `/downloads/${filename}` });
    } catch (e) {
      console.error('Processing error:', e);
      return res.status(500).json({ message: 'Failed to parse and convert PDF' });
    }
  });
}