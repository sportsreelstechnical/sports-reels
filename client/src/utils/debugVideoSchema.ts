
import { supabase } from '@/integrations/supabase/client';

export const debugVideoSchema = async () => {
  try {
    // Try to get the table structure by doing a select with limit 0
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .limit(0);

    console.log('Videos table schema check:', { data, error });

    // Also try to insert a minimal test record to see what fails
    const testData = {
      team_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      title: 'Test Title',
      video_url: 'test',
      video_type: 'match',
      duration: 0,
      file_size: 100
    };

    console.log('Testing minimal insert with:', testData);

    const { data: testResult, error: testError } = await supabase
      .from('videos')
      .insert(testData)
      .select();

    console.log('Test insert result:', { testResult, testError });

    return { schemaError: error, insertError: testError };
  } catch (err) {
    console.error('Debug schema error:', err);
    return { error: err };
  }
};
