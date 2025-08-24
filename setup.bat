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

cd ..

echo.
echo ✅ Setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Start MongoDB (if not already running):
echo    mongod
echo.
echo 2. Start the backend server:
echo    cd backend ^&^& npm start
echo.
echo 3. Start the frontend development server:
echo    cd frontend ^&^& npm run dev
echo.
echo 4. Open http://localhost:5173 in your browser
echo.
echo 📚 For more information, see README.md
echo.
echo 🎉 Happy coding!
pause 