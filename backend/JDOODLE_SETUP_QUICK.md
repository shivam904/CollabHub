# JDoodle API Setup - Quick Fix

## Current Issue
The external compiler is returning "Unauthorized Request" (403) because it's using placeholder credentials.

## Quick Fix Steps

### 1. Get JDoodle API Credentials
1. Go to [JDoodle](https://www.jdoodle.com/)
2. Sign up for a free account
3. Go to your dashboard
4. Copy your **Client ID** and **Client Secret**

### 2. Add Credentials to Environment
Create or update your `.env` file in the backend directory:

```bash
# .env file
JDOODLE_CLIENT_ID=your_actual_client_id_here
JDOODLE_CLIENT_SECRET=your_actual_client_secret_here
```

### 3. Restart Server
```bash
cd backend
npm start
```

### 4. Test the Fix
```bash
node test-compiler-integration.js
```

## Expected Results
- ✅ API authentication should work
- ✅ External compilation should succeed
- ✅ No more "Unauthorized Request" errors

## Alternative: Use Local Execution Only
If you don't want to use JDoodle API, the system will automatically fall back to local Docker execution, but you need to ensure Docker is running.

## Troubleshooting
- Make sure your `.env` file is in the correct location (backend directory)
- Ensure no spaces around the `=` in the environment variables
- Restart the server after adding credentials
- Check that Docker is running for local execution fallback

