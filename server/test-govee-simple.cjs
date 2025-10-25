const https = require('https');

const API_KEY = '674b8496-0aca-4908-ad92-a42d7575e3e7';
const BASE_URL = 'openapi.api.govee.com';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Govee-API-Key': API_KEY
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          resolve({ raw: body, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testConnection() {
  console.log('🔍 Testing Govee API connection...\n');

  try {
    const result = await makeRequest('/router/api/v1/user/devices');

    if (result.code === 200 && result.data && result.data.length > 0) {
      console.log('✅ SUCCESS! Connected to Govee API\n');
      console.log(`Found ${result.data.length} device(s):\n`);

      result.data.forEach((device, index) => {
        console.log(`Device ${index + 1}:`);
        console.log(`  Name: ${device.deviceName}`);
        console.log(`  Model: ${device.sku}`);
        console.log(`  ID: ${device.device}`);
        console.log(`  Type: ${device.type}`);
        console.log('');
      });

      console.log('✅ Your light is connected and ready to control!');
    } else {
      console.log('❌ FAILED: No devices found');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\nMake sure:');
      console.log('1. Your Govee bulb is powered on');
      console.log('2. Your bulb is connected to your phone hotspot');
      console.log('3. Your API key is valid');
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testConnection();
