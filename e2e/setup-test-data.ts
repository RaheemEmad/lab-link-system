/**
 * Test Data Setup Script
 * 
 * This script helps create test users for the Auto-Assign workflow tests.
 * Run this manually to set up test data before running e2e tests.
 * 
 * Test Users Required:
 * 
 * 1. Doctor Account:
 *    Email: doctor.test@lablink.test
 *    Password: TestDoctor123!
 *    Role: doctor
 * 
 * 2. Lab Staff Account:
 *    Email: lab.staff@lablink.test
 *    Password: TestLabStaff123!
 *    Role: lab_staff
 *    Lab ID: 00000000-0000-0000-0000-000000000001 (Test Lab)
 * 
 * Manual Setup Instructions:
 * ========================
 * 
 * Since we cannot create auth users through SQL, you need to:
 * 
 * 1. Sign up manually through the app UI:
 *    - Go to /auth
 *    - Create account with doctor.test@lablink.test / TestDoctor123!
 *    - Complete onboarding as Doctor
 *    - Create account with lab.staff@lablink.test / TestLabStaff123!
 *    - Complete onboarding as Lab Staff
 * 
 * 2. Then run this SQL to link the lab staff to the test lab:
 * 
 * -- Get the user_id for lab staff
 * SELECT id FROM auth.users WHERE email = 'lab.staff@lablink.test';
 * 
 * -- Update user_roles to link to test lab
 * UPDATE user_roles
 * SET lab_id = '00000000-0000-0000-0000-000000000001'
 * WHERE user_id = (SELECT id FROM auth.users WHERE email = 'lab.staff@lablink.test')
 * AND role = 'lab_staff';
 * 
 * Automated Test Data Verification:
 * =================================
 */

import { supabase } from '../src/integrations/supabase/client';

export async function verifyTestData() {
  console.log('🔍 Verifying test data setup...\n');

  // Check if test lab exists
  const { data: lab, error: labError } = await supabase
    .from('labs')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  if (labError || !lab) {
    console.error('❌ Test lab not found. Please run the SQL to create it.');
    return false;
  }
  console.log('✅ Test lab exists:', lab.name);

  // Check if test users exist (this won't work with RLS, need admin access)
  console.log('\n📝 Manual verification needed:');
  console.log('1. Doctor account: doctor.test@lablink.test');
  console.log('2. Lab staff account: lab.staff@lablink.test');
  console.log('3. Lab staff linked to test lab ID');
  
  console.log('\n🔧 To set up test users:');
  console.log('1. Sign up through /auth with the credentials above');
  console.log('2. Complete onboarding for each account');
  console.log('3. Run SQL to link lab staff to test lab (see comments in this file)');

  return true;
}

// Optional: Add helper functions to create test orders
export async function createTestAutoAssignOrder() {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'doctor.test@lablink.test')
    .single();

  if (profileError || !profile) {
    console.error('❌ Doctor test account not found');
    return null;
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      doctor_id: profile.id,
      doctor_name: 'Dr. Test',
      patient_name: 'Test Patient Auto-Assign',
      teeth_number: '11',
      teeth_shade: 'A2',
      restoration_type: 'Crown',
      urgency: 'Normal',
      auto_assign_pending: true,
      assigned_lab_id: null,
    })
    .select()
    .single();

  if (orderError) {
    console.error('❌ Failed to create test order:', orderError);
    return null;
  }

  console.log('✅ Test order created:', order.order_number);
  return order;
}

// Run verification if executed directly
if (require.main === module) {
  verifyTestData();
}
