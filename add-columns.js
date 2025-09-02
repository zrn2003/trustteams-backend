import pool from './src/db.js';

async function addMissingColumns() {
  try {
    console.log('🚀 Adding missing columns to users table...');
    
    // Add university_id column
    try {
      await pool.query('ALTER TABLE users ADD COLUMN university_id INT NULL');
      console.log('✅ Added university_id column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ university_id column already exists');
      } else {
        throw error;
      }
    }
    
    // Add institute_name column
    try {
      await pool.query('ALTER TABLE users ADD COLUMN institute_name VARCHAR(255) NULL');
      console.log('✅ Added institute_name column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ institute_name column already exists');
      } else {
        throw error;
      }
    }
    
    // Add index on university_id
    try {
      await pool.query('ALTER TABLE users ADD INDEX idx_university_id (university_id)');
      console.log('✅ Added index on university_id');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index on university_id already exists');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 All columns added successfully!');
    
    // Show the updated table structure
    console.log('\n📊 Current users table structure:');
    const [columns] = await pool.query('DESCRIBE users');
    columns.forEach(col => {
      console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}`);
    });
    
  } catch (error) {
    console.error('💥 Failed to add columns:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addMissingColumns();
