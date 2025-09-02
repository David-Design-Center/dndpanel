/**
 * Gmail Label ID Test Suite
 * 
 * Quick test matrix to validate correct Gmail system label usage
 * Run these after the label ID fixes to ensure 200 responses
 */

import { GMAIL_SYSTEM_LABELS, validateLabelIds } from '../constants/gmailLabels';

// Test matrix for Gmail label ID validation
export const GMAIL_LABEL_TESTS = [
  {
    name: 'Primary Unread',
    labelIds: [GMAIL_SYSTEM_LABELS.INBOX, GMAIL_SYSTEM_LABELS.CATEGORY.PRIMARY, GMAIL_SYSTEM_LABELS.UNREAD],
    expected: 200,
    description: 'Should fetch unread emails from Primary category'
  },
  {
    name: 'Primary Recent',
    labelIds: [GMAIL_SYSTEM_LABELS.INBOX, GMAIL_SYSTEM_LABELS.CATEGORY.PRIMARY],
    expected: 200,
    description: 'Should fetch recent emails from Primary category'
  },
  {
    name: 'Social Unread',
    labelIds: [GMAIL_SYSTEM_LABELS.INBOX, GMAIL_SYSTEM_LABELS.CATEGORY.SOCIAL, GMAIL_SYSTEM_LABELS.UNREAD],
    expected: 200,
    description: 'Should fetch unread emails from Social category'
  },
  {
    name: 'Updates Category',
    labelIds: [GMAIL_SYSTEM_LABELS.INBOX, GMAIL_SYSTEM_LABELS.CATEGORY.UPDATES],
    expected: 200,
    description: 'Should fetch emails from Updates category'
  },
  {
    name: 'Promotions Category',
    labelIds: [GMAIL_SYSTEM_LABELS.INBOX, GMAIL_SYSTEM_LABELS.CATEGORY.PROMOTIONS],
    expected: 200,
    description: 'Should fetch emails from Promotions category'
  },
  {
    name: 'Forums Category',
    labelIds: [GMAIL_SYSTEM_LABELS.INBOX, GMAIL_SYSTEM_LABELS.CATEGORY.FORUMS],
    expected: 200,
    description: 'Should fetch emails from Forums category'
  },
  {
    name: 'Sent Folder',
    labelIds: [GMAIL_SYSTEM_LABELS.SENT],
    expected: 200,
    description: 'Should fetch sent emails'
  },
  {
    name: 'Draft Folder',
    labelIds: [GMAIL_SYSTEM_LABELS.DRAFT],
    expected: 200,
    description: 'Should fetch draft emails'
  },
  {
    name: 'Trash Folder',
    labelIds: [GMAIL_SYSTEM_LABELS.TRASH],
    expected: 200,
    description: 'Should fetch trashed emails'
  },
  {
    name: 'Spam Folder',
    labelIds: [GMAIL_SYSTEM_LABELS.SPAM],
    expected: 200,
    description: 'Should fetch spam emails'
  },
  // Negative test cases
  {
    name: 'Invalid CATEGORY_PRIMARY (should fail)',
    labelIds: ['INBOX', 'CATEGORY_PRIMARY'], // ❌ Invalid - should be CATEGORY_PERSONAL
    expected: 400,
    description: 'Should fail with 400 - CATEGORY_PRIMARY is not a valid label ID'
  }
];

/**
 * Validate all test cases
 */
export function validateAllLabelTests(): void {
  console.log('🧪 Running Gmail Label ID validation tests...');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of GMAIL_LABEL_TESTS) {
    try {
      if (test.expected === 200) {
        // Should pass validation
        validateLabelIds(test.labelIds);
        console.log(`✅ ${test.name}: PASS`);
        passed++;
      } else {
        // Should fail validation
        try {
          validateLabelIds(test.labelIds);
          console.log(`❌ ${test.name}: FAIL - Should have thrown error`);
          failed++;
        } catch (error) {
          console.log(`✅ ${test.name}: PASS - Correctly rejected invalid labels`);
          passed++;
        }
      }
    } catch (error) {
      if (test.expected === 400) {
        console.log(`✅ ${test.name}: PASS - Correctly rejected invalid labels`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAIL - ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All Gmail Label ID tests passed!');
  } else {
    console.error('🚨 Some tests failed. Check label ID mappings.');
  }
}

/**
 * API call test helper (for manual testing in browser console)
 */
export async function testGmailApiCall(testCase: typeof GMAIL_LABEL_TESTS[0]): Promise<void> {
  try {
    console.log(`🧪 Testing API call: ${testCase.name}`);
    console.log(`📋 LabelIds: [${testCase.labelIds.join(', ')}]`);
    
    const response = await window.gapi.client.gmail.users.messages.list({
      userId: 'me',
      labelIds: testCase.labelIds,
      maxResults: 1,
      fields: 'messages(id),resultSizeEstimate'
    });
    
    if (response.status === 200) {
      console.log(`✅ ${testCase.name}: SUCCESS (200) - Found ${response.result.resultSizeEstimate || 0} messages`);
    } else {
      console.log(`❌ ${testCase.name}: UNEXPECTED STATUS ${response.status}`);
    }
  } catch (error: any) {
    const status = error.status || 'unknown';
    if (status === testCase.expected) {
      console.log(`✅ ${testCase.name}: Expected ${testCase.expected} - Got ${status}`);
    } else {
      console.log(`❌ ${testCase.name}: Expected ${testCase.expected} - Got ${status}`, error);
    }
  }
}

// Export for easy browser console testing
if (typeof window !== 'undefined') {
  (window as any).gmailLabelTests = {
    validateAllLabelTests,
    testGmailApiCall,
    GMAIL_LABEL_TESTS,
    GMAIL_SYSTEM_LABELS
  };
}
