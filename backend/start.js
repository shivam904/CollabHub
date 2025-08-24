import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Minimal .env setup
const envPath = join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  const defaultEnv = `MONGODB_URI=mongodb+srv://negishivam904:Kingshiva1234@cluster0.euo3u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
`;
  fs.writeFileSync(envPath, defaultEnv);
}

// Quick validation and start
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error('❌ Missing required environment variables in .env file');
  process.exit(1);
}

// Import and start server immediately
import('./index.js').catch(err => {
  console.error('❌ Server startup failed:', err.message);
  process.exit(1);
}); 