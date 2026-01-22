/**
 * Test script to verify rate limit headers on all endpoints
 *
 * This script tests that all rate-limited endpoints return proper headers:
 * - Retry-After
 * - X-RateLimit-Limit
 * - X-RateLimit-Remaining
 */

interface TestResult {
  endpoint: string
  method: string
  status: 'PASS' | 'FAIL'
  details: string
  headers?: {
    'retry-after'?: string
    'x-ratelimit-limit'?: string
    'x-ratelimit-remaining'?: string
  }
}

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const results: TestResult[] = []

// Helper function to make requests
async function makeRequest(
  endpoint: string,
  method: string = 'POST',
  body?: any,
  headers: Record<string, string> = {}
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }

  const url = endpoint.startsWith('?')
    ? `${BASE_URL}/api/auth/verify-email${endpoint}`
    : `${BASE_URL}${endpoint}`

  return fetch(url, options)
}

// Helper to trigger rate limit
async function triggerRateLimit(
  endpoint: string,
  method: string,
  getBody: () => any,
  maxAttempts: number = 20
): Promise<Response | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await makeRequest(endpoint, method, getBody())
    if (response.status === 429) {
      return response
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return null
}

// Test functions for each endpoint
async function testVerify2FA() {
  console.log('\n🔍 Testing /api/auth/verify-2fa...')

  const response = await triggerRateLimit(
    '/api/auth/verify-2fa',
    'POST',
    () => ({ userId: 'test-user', code: '123456', isBackupCode: false })
  )

  if (!response) {
    results.push({
      endpoint: '/api/auth/verify-2fa',
      method: 'POST',
      status: 'FAIL',
      details: 'Could not trigger rate limit after 20 attempts',
    })
    return
  }

  const headers = {
    'retry-after': response.headers.get('retry-after') || undefined,
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
  }

  const hasAllHeaders = headers['retry-after'] && headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']

  results.push({
    endpoint: '/api/auth/verify-2fa',
    method: 'POST',
    status: hasAllHeaders ? 'PASS' : 'FAIL',
    details: hasAllHeaders
      ? `All headers present: Retry-After=${headers['retry-after']}, Limit=${headers['x-ratelimit-limit']}, Remaining=${headers['x-ratelimit-remaining']}`
      : `Missing headers: ${!headers['retry-after'] ? 'Retry-After ' : ''}${!headers['x-ratelimit-limit'] ? 'X-RateLimit-Limit ' : ''}${!headers['x-ratelimit-remaining'] ? 'X-RateLimit-Remaining' : ''}`,
    headers,
  })
}

async function testComplete2FALogin() {
  console.log('\n🔍 Testing /api/auth/complete-2fa-login...')

  const response = await triggerRateLimit(
    '/api/auth/complete-2fa-login',
    'POST',
    () => ({ userId: 'test-user', sessionToken: 'invalid-token' })
  )

  if (!response) {
    results.push({
      endpoint: '/api/auth/complete-2fa-login',
      method: 'POST',
      status: 'FAIL',
      details: 'Could not trigger rate limit after 20 attempts',
    })
    return
  }

  const headers = {
    'retry-after': response.headers.get('retry-after') || undefined,
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
  }

  const hasAllHeaders = headers['retry-after'] && headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']

  results.push({
    endpoint: '/api/auth/complete-2fa-login',
    method: 'POST',
    status: hasAllHeaders ? 'PASS' : 'FAIL',
    details: hasAllHeaders
      ? `All headers present: Retry-After=${headers['retry-after']}, Limit=${headers['x-ratelimit-limit']}, Remaining=${headers['x-ratelimit-remaining']}`
      : `Missing headers: ${!headers['retry-after'] ? 'Retry-After ' : ''}${!headers['x-ratelimit-limit'] ? 'X-RateLimit-Limit ' : ''}${!headers['x-ratelimit-remaining'] ? 'X-RateLimit-Remaining' : ''}`,
    headers,
  })
}

async function testRegister() {
  console.log('\n🔍 Testing /api/auth/register...')

  const response = await triggerRateLimit(
    '/api/auth/register',
    'POST',
    () => ({ name: 'Test', email: `test${Date.now()}@example.com`, password: 'Test123456!' })
  )

  if (!response) {
    results.push({
      endpoint: '/api/auth/register',
      method: 'POST',
      status: 'FAIL',
      details: 'Could not trigger rate limit after 20 attempts',
    })
    return
  }

  const headers = {
    'retry-after': response.headers.get('retry-after') || undefined,
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
  }

  const hasAllHeaders = headers['retry-after'] && headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']

  results.push({
    endpoint: '/api/auth/register',
    method: 'POST',
    status: hasAllHeaders ? 'PASS' : 'FAIL',
    details: hasAllHeaders
      ? `All headers present: Retry-After=${headers['retry-after']}, Limit=${headers['x-ratelimit-limit']}, Remaining=${headers['x-ratelimit-remaining']}`
      : `Missing headers: ${!headers['retry-after'] ? 'Retry-After ' : ''}${!headers['x-ratelimit-limit'] ? 'X-RateLimit-Limit ' : ''}${!headers['x-ratelimit-remaining'] ? 'X-RateLimit-Remaining' : ''}`,
    headers,
  })
}

async function testResetPassword() {
  console.log('\n🔍 Testing /api/auth/reset-password...')

  const response = await triggerRateLimit(
    '/api/auth/reset-password',
    'POST',
    () => ({ token: 'invalid-token', password: 'NewPass123!' })
  )

  if (!response) {
    results.push({
      endpoint: '/api/auth/reset-password',
      method: 'POST',
      status: 'FAIL',
      details: 'Could not trigger rate limit after 20 attempts',
    })
    return
  }

  const headers = {
    'retry-after': response.headers.get('retry-after') || undefined,
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
  }

  const hasAllHeaders = headers['retry-after'] && headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']

  results.push({
    endpoint: '/api/auth/reset-password',
    method: 'POST',
    status: hasAllHeaders ? 'PASS' : 'FAIL',
    details: hasAllHeaders
      ? `All headers present: Retry-After=${headers['retry-after']}, Limit=${headers['x-ratelimit-limit']}, Remaining=${headers['x-ratelimit-remaining']}`
      : `Missing headers: ${!headers['retry-after'] ? 'Retry-After ' : ''}${!headers['x-ratelimit-limit'] ? 'X-RateLimit-Limit ' : ''}${!headers['x-ratelimit-remaining'] ? 'X-RateLimit-Remaining' : ''}`,
    headers,
  })
}

async function testVerifyEmail() {
  console.log('\n🔍 Testing /api/auth/verify-email...')

  const response = await triggerRateLimit(
    '?token=invalid-token',
    'GET',
    () => undefined
  )

  if (!response) {
    results.push({
      endpoint: '/api/auth/verify-email',
      method: 'GET',
      status: 'FAIL',
      details: 'Could not trigger rate limit after 20 attempts',
    })
    return
  }

  const headers = {
    'retry-after': response.headers.get('retry-after') || undefined,
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
  }

  const hasAllHeaders = headers['retry-after'] && headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']

  results.push({
    endpoint: '/api/auth/verify-email',
    method: 'GET',
    status: hasAllHeaders ? 'PASS' : 'FAIL',
    details: hasAllHeaders
      ? `All headers present: Retry-After=${headers['retry-after']}, Limit=${headers['x-ratelimit-limit']}, Remaining=${headers['x-ratelimit-remaining']}`
      : `Missing headers: ${!headers['retry-after'] ? 'Retry-After ' : ''}${!headers['x-ratelimit-limit'] ? 'X-RateLimit-Limit ' : ''}${!headers['x-ratelimit-remaining'] ? 'X-RateLimit-Remaining' : ''}`,
    headers,
  })
}

async function testResendVerification() {
  console.log('\n🔍 Testing /api/auth/resend-verification...')

  const response = await triggerRateLimit(
    '/api/auth/resend-verification',
    'POST',
    () => ({ email: 'test@example.com' })
  )

  if (!response) {
    results.push({
      endpoint: '/api/auth/resend-verification',
      method: 'POST',
      status: 'FAIL',
      details: 'Could not trigger rate limit after 20 attempts',
    })
    return
  }

  const headers = {
    'retry-after': response.headers.get('retry-after') || undefined,
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
  }

  const hasAllHeaders = headers['retry-after'] && headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']

  results.push({
    endpoint: '/api/auth/resend-verification',
    method: 'POST',
    status: hasAllHeaders ? 'PASS' : 'FAIL',
    details: hasAllHeaders
      ? `All headers present: Retry-After=${headers['retry-after']}, Limit=${headers['x-ratelimit-limit']}, Remaining=${headers['x-ratelimit-remaining']}`
      : `Missing headers: ${!headers['retry-after'] ? 'Retry-After ' : ''}${!headers['x-ratelimit-limit'] ? 'X-RateLimit-Limit ' : ''}${!headers['x-ratelimit-remaining'] ? 'X-RateLimit-Remaining' : ''}`,
    headers,
  })
}

async function testForgotPassword() {
  console.log('\n🔍 Testing /api/auth/forgot-password...')

  const response = await triggerRateLimit(
    '/api/auth/forgot-password',
    'POST',
    () => ({ email: 'test@example.com' })
  )

  if (!response) {
    results.push({
      endpoint: '/api/auth/forgot-password',
      method: 'POST',
      status: 'FAIL',
      details: 'Could not trigger rate limit after 20 attempts',
    })
    return
  }

  const headers = {
    'retry-after': response.headers.get('retry-after') || undefined,
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
  }

  const hasAllHeaders = headers['retry-after'] && headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']

  results.push({
    endpoint: '/api/auth/forgot-password',
    method: 'POST',
    status: hasAllHeaders ? 'PASS' : 'FAIL',
    details: hasAllHeaders
      ? `All headers present: Retry-After=${headers['retry-after']}, Limit=${headers['x-ratelimit-limit']}, Remaining=${headers['x-ratelimit-remaining']}`
      : `Missing headers: ${!headers['retry-after'] ? 'Retry-After ' : ''}${!headers['x-ratelimit-limit'] ? 'X-RateLimit-Limit ' : ''}${!headers['x-ratelimit-remaining'] ? 'X-RateLimit-Remaining' : ''}`,
    headers,
  })
}

async function testEmailChangeVerify() {
  console.log('\n🔍 Testing /api/user/email/verify...')

  const response = await triggerRateLimit(
    '/api/user/email/verify',
    'POST',
    () => ({ token: 'invalid-token' })
  )

  if (!response) {
    results.push({
      endpoint: '/api/user/email/verify',
      method: 'POST',
      status: 'FAIL',
      details: 'Could not trigger rate limit after 20 attempts',
    })
    return
  }

  const headers = {
    'retry-after': response.headers.get('retry-after') || undefined,
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
  }

  const hasAllHeaders = headers['retry-after'] && headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']

  results.push({
    endpoint: '/api/user/email/verify',
    method: 'POST',
    status: hasAllHeaders ? 'PASS' : 'FAIL',
    details: hasAllHeaders
      ? `All headers present: Retry-After=${headers['retry-after']}, Limit=${headers['x-ratelimit-limit']}, Remaining=${headers['x-ratelimit-remaining']}`
      : `Missing headers: ${!headers['retry-after'] ? 'Retry-After ' : ''}${!headers['x-ratelimit-limit'] ? 'X-RateLimit-Limit ' : ''}${!headers['x-ratelimit-remaining'] ? 'X-RateLimit-Remaining' : ''}`,
    headers,
  })
}

async function testEmailChangeCancel() {
  console.log('\n🔍 Testing /api/user/email/cancel...')

  const response = await triggerRateLimit(
    '/api/user/email/cancel',
    'POST',
    () => ({ cancelToken: 'invalid-token' })
  )

  if (!response) {
    results.push({
      endpoint: '/api/user/email/cancel',
      method: 'POST',
      status: 'FAIL',
      details: 'Could not trigger rate limit after 20 attempts',
    })
    return
  }

  const headers = {
    'retry-after': response.headers.get('retry-after') || undefined,
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
  }

  const hasAllHeaders = headers['retry-after'] && headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']

  results.push({
    endpoint: '/api/user/email/cancel',
    method: 'POST',
    status: hasAllHeaders ? 'PASS' : 'FAIL',
    details: hasAllHeaders
      ? `All headers present: Retry-After=${headers['retry-after']}, Limit=${headers['x-ratelimit-limit']}, Remaining=${headers['x-ratelimit-remaining']}`
      : `Missing headers: ${!headers['retry-after'] ? 'Retry-After ' : ''}${!headers['x-ratelimit-limit'] ? 'X-RateLimit-Limit ' : ''}${!headers['x-ratelimit-remaining'] ? 'X-RateLimit-Remaining' : ''}`,
    headers,
  })
}

// Print results
function printResults() {
  console.log('\n\n' + '='.repeat(80))
  console.log('RATE LIMIT HEADERS TEST RESULTS')
  console.log('='.repeat(80) + '\n')

  let passed = 0
  let failed = 0

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌'
    console.log(`${icon} ${result.method} ${result.endpoint}`)
    console.log(`   ${result.details}`)
    if (result.headers) {
      console.log(`   Headers: retry-after=${result.headers['retry-after']}, limit=${result.headers['x-ratelimit-limit']}, remaining=${result.headers['x-ratelimit-remaining']}`)
    }
    console.log()

    if (result.status === 'PASS') passed++
    else failed++
  })

  console.log('='.repeat(80))
  console.log(`SUMMARY: ${passed} passed, ${failed} failed out of ${results.length} tests`)
  console.log('='.repeat(80) + '\n')

  if (failed > 0) {
    process.exit(1)
  }
}

// Run all tests
async function runTests() {
  console.log('Starting rate limit header tests...')
  console.log(`Testing against: ${BASE_URL}`)
  console.log('This will trigger rate limits on various endpoints.')
  console.log('Please ensure the server is running and database is accessible.\n')

  try {
    await testVerify2FA()
    await testComplete2FALogin()
    await testRegister()
    await testResetPassword()
    await testVerifyEmail()
    await testResendVerification()
    await testForgotPassword()
    await testEmailChangeVerify()
    await testEmailChangeCancel()

    printResults()
  } catch (error) {
    console.error('Test suite failed with error:', error)
    process.exit(1)
  }
}

// Run tests
runTests()
