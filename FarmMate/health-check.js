#!/usr/bin/env node

/**
 * Simple health check script for deployment monitoring
 * Tests the /health endpoint to ensure the server is running properly
 */

import http from 'http';

const PORT = process.env.PORT || '5000';
const HOST = process.env.HOST || '0.0.0.0';

const options = {
  hostname: HOST === '0.0.0.0' ? 'localhost' : HOST,
  port: PORT,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const healthData = JSON.parse(data);
        console.log('✅ Health check passed:', healthData);
        process.exit(0);
      } catch (e) {
        console.error('❌ Health check failed: Invalid JSON response');
        process.exit(1);
      }
    } else {
      console.error(`❌ Health check failed: HTTP ${res.statusCode}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Health check failed:', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Health check failed: Request timeout');
  req.destroy();
  process.exit(1);
});

req.end();