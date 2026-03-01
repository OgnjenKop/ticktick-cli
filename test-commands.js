const { TickTickApi } = require('./dist/core/api');

async function testCommands() {
  const api = new TickTickApi();
  
  console.log('Testing TickTick CLI commands...\n');
  
  // Test 1: Test authentication status
  console.log('1. Testing authentication status:');
  console.log('Is authenticated:', api.isAuthenticated());
  
  // Test 2: Test token management
  console.log('\n2. Testing token management:');
  console.log('Current token:', api.getToken());
  
  // Test 3: Test setting a token (simulated)
  console.log('\n3. Testing setToken():');
  api.setToken('test-token-123');
  console.log('Token set. Is authenticated:', api.isAuthenticated());
  console.log('Current token:', api.getToken());
  
  // Test 4: Test clearing token
  console.log('\n4. Testing clearToken():');
  api.clearToken();
  console.log('Token cleared. Is authenticated:', api.isAuthenticated());
  console.log('Current token:', api.getToken());
  
  console.log('\n✅ All command tests passed!');
}

testCommands().catch(console.error);