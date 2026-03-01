import { TickTickApi } from './src/core/api';

async function testApi() {
  const api = new TickTickApi();

  console.log('Testing TickTick API endpoints...\n');

  // Test 1: Try to access projects without authentication
  console.log('1. Testing getProjects() (unauthenticated):');
  try {
    const projects = await api.getProjects();
    console.log('Success! Projects:', projects);
  } catch (error: any) {
    console.log('Error:', error.message);
  }

  console.log('\n2. Testing getTasks() (unauthenticated):');
  try {
    const tasks = await api.getTasks();
    console.log('Success! Tasks:', tasks);
  } catch (error: any) {
    console.log('Error:', error.message);
  }

  console.log('\n3. Testing authentication status:');
  console.log('Is authenticated:', api.isAuthenticated());

  console.log('\n4. Testing token management:');
  console.log('Current token:', api.getToken());

  // Test 5: Test project creation (will fail without auth, but tests the method)
  console.log('\n5. Testing createProject() (will fail without auth):');
  try {
    const project = await api.createProject('Test Project', '#FF5733');
    console.log('Success! Created project:', project);
  } catch (error: any) {
    console.log('Expected error:', error.message);
  }

  // Test 6: Test task creation (will fail without auth, but tests the method)
  console.log('\n6. Testing createTask() (will fail without auth):');
  try {
    const task = await api.createTask({
      title: 'Test Task',
      content: 'This is a test task',
      projectId: 'inbox',
    });
    console.log('Success! Created task:', task);
  } catch (error: any) {
    console.log('Expected error:', error.message);
  }
}

testApi().catch(console.error);
