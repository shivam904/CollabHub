import fetch from 'node-fetch';

async function testJDoodleAPI() {
  console.log('🧪 Testing JDoodle API...\n');
  
  // Test credentials (these are the default ones that don't work)
  const clientId = '65e9447452704668f02a539a2aa0fb5e';
  const clientSecret = '3690ada3dbb564e90a80aa9f13de742f0032503b7e3dd1492e3173e37d8f7f4d';
  
  try {
    // Step 1: Get access token
    console.log('🔑 Step 1: Getting access token...');
    const authResponse = await fetch('https://api.jdoodle.com/v1/auth-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: clientId,
        clientSecret: clientSecret
      })
    });
    
    console.log(`📥 Auth Response Status: ${authResponse.status}`);
    console.log(`📥 Auth Response Headers:`, Object.fromEntries(authResponse.headers.entries()));
    
    const authText = await authResponse.text();
    console.log(`📥 Auth Response Text:`, authText.substring(0, 200));
    
    let accessToken;
    try {
      const authData = JSON.parse(authText);
      accessToken = authData.access_token;
      console.log(`✅ Got access token from JSON response`);
    } catch (parseError) {
      if (authText.startsWith('eyJ')) {
        accessToken = authText;
        console.log(`✅ Got direct JWT token`);
      } else {
        throw new Error(`Failed to parse auth response: ${authText.substring(0, 100)}`);
      }
    }
    
    if (!accessToken) {
      throw new Error('No access token received');
    }
    
    console.log(`🔑 Access Token: ${accessToken.substring(0, 50)}...`);
    
    // Step 2: Test code execution
    console.log('\n🚀 Step 2: Testing code execution...');
    const executePayload = {
      script: 'console.log("Hello from JavaScript!");',
      language: 'nodejs',
      versionIndex: '4',
      stdin: ''
    };
    
    console.log(`📤 Execute Payload:`, JSON.stringify(executePayload, null, 2));
    
    const executeResponse = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(executePayload)
    });
    
    console.log(`📥 Execute Response Status: ${executeResponse.status}`);
    console.log(`📥 Execute Response Headers:`, Object.fromEntries(executeResponse.headers.entries()));
    
    const executeText = await executeResponse.text();
    console.log(`📥 Execute Response Text:`, executeText);
    
    try {
      const executeData = JSON.parse(executeText);
      console.log(`📊 Parsed Execute Response:`, executeData);
      
      if (executeData.statusCode === 200) {
        console.log('✅ Code execution successful!');
        console.log(`📤 Output: ${executeData.output}`);
        console.log(`❌ Error: ${executeData.error}`);
        console.log(`⏱️ CPU Time: ${executeData.cpuTime}ms`);
        console.log(`💾 Memory: ${executeData.memory}KB`);
      } else {
        console.log('❌ Code execution failed!');
        console.log(`Error: ${executeData.error}`);
        console.log(`Status: ${executeData.statusCode}`);
      }
    } catch (parseError) {
      console.log('❌ Failed to parse execute response as JSON');
      console.log(`Raw response: ${executeText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testJDoodleAPI();
