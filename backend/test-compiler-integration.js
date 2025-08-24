import externalCompilerService from './services/externalCompiler.js';

const TEST_FILES = [
  {
    name: 'hello.js',
    code: `console.log("Hello from JavaScript!");
console.log("External compiler is working!");`
  },
  {
    name: 'hello.py',
    code: `print("Hello from Python!")
print("External compiler is working!")`
  },
  {
    name: 'hello.java',
    code: `public class hello {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
        System.out.println("External compiler is working!");
    }
}`
  }
];

async function testCompilerIntegration() {
  console.log('🧪 Testing External Compiler Integration...\n');
  
  for (const testFile of TEST_FILES) {
    console.log(`📁 Testing file: ${testFile.name}`);
    
    // Check if supported
    const isSupported = externalCompilerService.isSupported(testFile.name);
    console.log(`✅ Supported: ${isSupported}`);
    
    if (isSupported) {
      try {
        console.log('🚀 Executing code...');
        const result = await externalCompilerService.compileAndExecute(
          testFile.name, 
          testFile.code
        );
        
        console.log(`📊 Success: ${result.success}`);
        console.log(`🔧 Language: ${result.language}`);
        console.log(`⏱️ CPU Time: ${result.cpuTime}ms`);
        console.log(`💾 Memory: ${result.memory}KB`);
        
        if (result.success) {
          console.log('📤 Output:');
          console.log(result.output);
        } else {
          console.log('❌ Error:');
          console.log(result.error);
        }
        
      } catch (error) {
        console.error(`❌ Execution failed: ${error.message}`);
      }
    }
    
    console.log('─'.repeat(50));
    console.log('');
  }
  
  console.log('✅ Compiler integration test completed!');
}

// Run the test
testCompilerIntegration().catch(console.error);
