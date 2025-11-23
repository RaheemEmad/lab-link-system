/**
 * Automated Test User Creation Script
 * 
 * This script creates test users programmatically using the create-test-user edge function.
 * Run this to set up test data for E2E tests.
 */

import { supabase } from '../src/integrations/supabase/client';

const TEST_LAB_ID = '00000000-0000-0000-0000-000000000001';

async function createTestUsers() {
  console.log('🚀 Creating test users...\n');

  try {
    // Create doctor test account
    console.log('Creating doctor account...');
    const { data: doctorData, error: doctorError } = await supabase.functions.invoke(
      'create-test-user',
      {
        body: {
          email: 'doctor.test@lablink.test',
          password: 'TestDoctor123!',
          role: 'doctor',
          profileData: {
            full_name: 'Dr. Test Doctor',
            phone: '+1234567890',
            clinic_name: 'Test Dental Clinic',
            specialty: 'General Dentistry',
          },
        },
      }
    );

    if (doctorError) {
      console.error('❌ Doctor creation failed:', doctorError);
    } else {
      console.log('✅ Doctor account created:', doctorData);
    }

    // Create lab staff test account
    console.log('\nCreating lab staff account...');
    const { data: labData, error: labError } = await supabase.functions.invoke(
      'create-test-user',
      {
        body: {
          email: 'lab.staff@lablink.test',
          password: 'TestLabStaff123!',
          role: 'lab_staff',
          profileData: {
            full_name: 'Test Lab Staff',
            phone: '+1234567891',
            lab_name: 'Test Lab',
            lab_license_number: 'TEST-LAB-001',
            tax_id: 'TEST-TAX-123',
            business_address: '123 Test Street, Test City, TC 12345',
          },
          lab_id: TEST_LAB_ID,
        },
      }
    );

    if (labError) {
      console.error('❌ Lab staff creation failed:', labError);
    } else {
      console.log('✅ Lab staff account created:', labData);
    }

    console.log('\n✨ Test user creation complete!');
    console.log('\nTest Credentials:');
    console.log('─────────────────────────────────────');
    console.log('Doctor:');
    console.log('  Email: doctor.test@lablink.test');
    console.log('  Password: TestDoctor123!');
    console.log('\nLab Staff:');
    console.log('  Email: lab.staff@lablink.test');
    console.log('  Password: TestLabStaff123!');
    console.log('─────────────────────────────────────\n');
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the script
createTestUsers();
