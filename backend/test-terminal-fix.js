import { getDockerWorkspaceManager } from './services/dockerWorkspace.js';

const TEST_PROJECT_ID = '68a60fbb9c9ae19f69f0d835'; // Use the actual project ID

async function testTerminalFix() {
  console.log('🧪 Testing terminal execution fix for all languages...\n');
  
  try {
    const dockerManager = getDockerWorkspaceManager();
    
    // 1. Test Python execution
    console.log('1️⃣ Testing Python execution...');
    const pythonContent = `print("Hello from Python!")
print("Python is working correctly!")`;
    
    await dockerManager.writeFileToContainer(TEST_PROJECT_ID, 'test_python.py', pythonContent);
    console.log('✅ Python file created');
    
    const pythonResult = await dockerManager.executeInContainer(
      await dockerManager.getProjectContainer(TEST_PROJECT_ID),
      ['python3', '/workspace/test_python.py']
    );
    console.log('🐍 Python output:', pythonResult.output);
    console.log('');
    
    // 2. Test JavaScript execution
    console.log('2️⃣ Testing JavaScript execution...');
    const jsContent = `console.log("Hello from JavaScript!");
console.log("JavaScript is working correctly!");`;
    
    await dockerManager.writeFileToContainer(TEST_PROJECT_ID, 'test_js.js', jsContent);
    console.log('✅ JavaScript file created');
    
    const jsResult = await dockerManager.executeInContainer(
      await dockerManager.getProjectContainer(TEST_PROJECT_ID),
      ['node', '/workspace/test_js.js']
    );
    console.log('🟢 JavaScript output:', jsResult.output);
    console.log('');
    
    // 3. Test Java execution
    console.log('3️⃣ Testing Java execution...');
    const javaContent = `public class TestJava {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
        System.out.println("Java is working correctly!");
    }
}`;
    
    await dockerManager.writeFileToContainer(TEST_PROJECT_ID, 'TestJava.java', javaContent);
    console.log('✅ Java file created');
    
    const javaResult = await dockerManager.executeInContainer(
      await dockerManager.getProjectContainer(TEST_PROJECT_ID),
      ['sh', '-c', 'cd /workspace && javac TestJava.java && java TestJava']
    );
    console.log('☕ Java output:', javaResult.output);
    console.log('');
    
    // 4. Test Go execution
    console.log('4️⃣ Testing Go execution...');
    const goContent = `package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")
    fmt.Println("Go is working correctly!")
}`;
    
    await dockerManager.writeFileToContainer(TEST_PROJECT_ID, 'test_go.go', goContent);
    console.log('✅ Go file created');
    
    const goResult = await dockerManager.executeInContainer(
      await dockerManager.getProjectContainer(TEST_PROJECT_ID),
      ['sh', '-c', 'cd /workspace && go run test_go.go']
    );
    console.log('🚀 Go output:', goResult.output);
    console.log('');
    
    // 5. Cleanup
    console.log('5️⃣ Cleaning up test files...');
    await dockerManager.deleteFileFromContainer(TEST_PROJECT_ID, 'test_python.py');
    await dockerManager.deleteFileFromContainer(TEST_PROJECT_ID, 'test_js.js');
    await dockerManager.deleteFileFromContainer(TEST_PROJECT_ID, 'TestJava.java');
    await dockerManager.deleteFileFromContainer(TEST_PROJECT_ID, 'test_go.go');
    console.log('✅ Test files cleaned up');
    
    console.log('\n✅ Terminal execution test completed!');
    console.log('\n📋 Analysis:');
    console.log('- If all languages show output, the fix worked!');
    console.log('- If any language shows no output, there is still an issue');
    console.log('- Check the console logs above for detailed results');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTerminalFix().catch(console.error);
