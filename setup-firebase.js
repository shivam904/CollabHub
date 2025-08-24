#!/usr/bin/env node

/**
 * Firebase Setup Script for CollabHub
 * This script helps users set up their Firebase credentials
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 CollabHub Firebase Setup');
console.log('==========================\n');

const configPath = path.join(__dirname, 'backend', 'config', 'serviceAccountKey.json');
const examplePath = path.join(__dirname, 'backend', 'config', 'serviceAccountKey.example.json');

// Check if service account key exists
if (fs.existsSync(configPath)) {
  console.log('✅ Firebase service account key found!');
  console.log('Location:', configPath);
} else {
  console.log('❌ Firebase service account key not found!');
  console.log('\n📋 Setup Instructions:');
  console.log('1. Go to https://console.firebase.google.com/');
  console.log('2. Create a new project or select existing one');
  console.log('3. Go to Project Settings > Service Accounts');
  console.log('4. Click "Generate new private key"');
  console.log('5. Download the JSON file');
  console.log('6. Rename it to "serviceAccountKey.json"');
  console.log('7. Place it in: backend/config/');
  console.log('\n📁 Expected location:', configPath);
  
  // Check if example file exists
  if (fs.existsSync(examplePath)) {
    console.log('\n📄 Example file available at:', examplePath);
    console.log('Use this as a template for your configuration.');
  }
}

console.log('\n🔒 Security Note:');
console.log('- The serviceAccountKey.json file is gitignored');
console.log('- Never commit this file to version control');
console.log('- Keep your credentials secure');

console.log('\n📚 For more information, see the README.md file.');
