import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body;

  // Check if the code exists in sections table
  const { data: sectionData, error: sectionError } = await supabase
    .from('sections')
    .select('*')
    .eq('code', code)
    .single();

  if (sectionError || !sectionData) {
    return res.status(400).json({ success: false, error: 'Invalid section code' });
  }

  // Get all students in that section
  const { data: studentsData, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('section', sectionData.section);

  if (studentsError || !studentsData || studentsData.length === 0) {
    return res.status(400).json({ success: false, error: 'No students found for this section' });
  }

  // For demo, just return first student
  res.status(200).json({ success: true, students: studentsData });
}
