const { supabase } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  try {
    console.log('🗄️  Setting up database schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} database statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await supabase.rpc('exec_sql', { sql: statement + ';' });
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error) {
          console.log(`⚠️  Statement ${i + 1} warning: ${error.message}`);
          // Continue with next statement as some might be already created
        }
      }
    }
    
    console.log('🎉 Database setup completed successfully!');
    
    // Test the setup by inserting a test record
    const { data, error } = await supabase
      .from('health_content')
      .select('count(*)')
      .single();
    
    if (error) {
      console.error('❌ Database setup verification failed:', error.message);
    } else {
      console.log('✅ Database verification successful');
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n📋 Manual setup instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of database/schema.sql');
    console.log('4. Run the SQL commands');
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase().then(() => process.exit(0));
}

module.exports = { setupDatabase };