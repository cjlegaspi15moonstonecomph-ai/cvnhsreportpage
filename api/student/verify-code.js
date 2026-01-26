import { sectionCodes } from './section-codes.js';
import students from './students.json' assert { type: 'json' };

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body;

  if (!sectionCodes[code]) {
    return res.status(400).json({ success: false, error: 'Invalid code' });
  }

  // For demo purposes, we just return all students in that section
  const sectionStudents = students.filter(s => sectionCodes[code].includes(s.lrn));

  if (sectionStudents.length === 0) {
    return res.status(400).json({ success: false, error: 'No students found for this code' });
  }

  // In real life, you might ask the student to still enter their LRN later
  res.status(200).json({ success: true, students: sectionStudents });
}
