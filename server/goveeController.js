import https from 'https';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = '674b8496-0aca-4908-ad92-a42d7575e3e7';
const BASE_URL = 'openapi.api.govee.com';

let cachedDevice = null;

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

async function getDevice() {
  if (cachedDevice) {
    return cachedDevice;
  }

  const result = await makeRequest('/router/api/v1/user/devices');

  if (result.data && result.data.length > 0) {
    cachedDevice = result.data[0];
    console.log(`📱 Connected to Govee device: ${cachedDevice.deviceName}`);
    return cachedDevice;
  }

  return null;
}

async function controlDevice(capability) {
  const device = await getDevice();

  if (!device) {
    throw new Error('No Govee device found');
  }

  const requestData = {
    requestId: uuidv4(),
    payload: {
      sku: device.sku,
      device: device.device,
      capability: capability
    }
  };

  return await makeRequest('/router/api/v1/device/control', 'POST', requestData);
}

function rgbToInt(r, g, b) {
  return ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | ((b & 0xFF) << 0);
}

export async function turnOn() {
  console.log('💡 Turning Govee light ON');
  return await controlDevice({
    type: 'devices.capabilities.on_off',
    instance: 'powerSwitch',
    value: 1
  });
}

export async function turnOff() {
  console.log('💡 Turning Govee light OFF');
  return await controlDevice({
    type: 'devices.capabilities.on_off',
    instance: 'powerSwitch',
    value: 0
  });
}

export async function setColor(r, g, b) {
  console.log(`🎨 Setting Govee light color to RGB(${r}, ${g}, ${b})`);
  return await controlDevice({
    type: 'devices.capabilities.color_setting',
    instance: 'colorRgb',
    value: rgbToInt(r, g, b)
  });
}

export async function setBrightness(percent) {
  console.log(`💡 Setting Govee light brightness to ${percent}%`);
  return await controlDevice({
    type: 'devices.capabilities.range',
    instance: 'brightness',
    value: percent
  });
}

// Initialize device connection on module load
getDevice().catch(err => {
  console.error('Failed to connect to Govee device:', err.message);
});
