@echo off
echo 🚀 Setting up CollabHub - Collaborative Code Editor
echo ==================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

REM Backend setup
echo.
echo 📦 Setting up Backend...
cd backend

REM Install dependencies
echo Installing backend dependencies...
call npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file...
    (
        echo PORT=5000
        echo MONGODB_URI=mongodb://localhost:27017/collabhub
        echo JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
        echo CORS_ORIGIN=http://localhost:5173
        echo NODE_ENV=development
        echo DEBUG=true
    ) > .env
    echo ✅ Created .env file
) else (
    echo ✅ .env file already exists
)

cd ..

REM Frontend setup
echo.
echo 📦 Setting up Frontend...
cd frontend

REM Install dependencies
echo Installing frontend dependencies...
call npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating frontend .env file...
    (
        echo # Firebase Configuration
        echo VITE_FIREBASE_API_KEY=your_firebase_api_key_here
        echo VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
        echo VITE_FIREBASE_PROJECT_ID=your_project_id
        echo VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
        echo VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
        echo VITE_FIREBASE_APP_ID=your_app_id
        echo VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
        echo.
        echo # API Configuration
        echo VITE_API_URL=http://localhost:5000
        echo VITE_WS_URL=ws://localhost:5000
        echo.
        echo # Development Configuration
        echo VITE_DEBUG_MODE=false
        echo VITE_LOG_LEVEL=info
    ) > .env
    echo ✅ Created frontend .env file
) else (
    echo ✅ Frontend .env file already exists
)

cd ..

echo.
echo ✅ Setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Configure Firebase:
echo    - Go to https://console.firebase.google.com/
echo    - Create a new project or select existing one
echo    - Update backend/.env with Firebase credentials
echo    - Update frontend/.env with Firebase config
echo.
echo 2. Start MongoDB (if not already running):
echo    mongod
echo.
echo 3. Start the backend server:
echo    cd backend ^&^& npm start
echo.
echo 4. Start the frontend development server:
echo    cd frontend ^&^& npm run dev
echo.
echo 5. Open http://localhost:5173 in your browser
echo.
echo 📚 For more information, see README.md
echo.
echo 🎉 Happy coding!
pause 