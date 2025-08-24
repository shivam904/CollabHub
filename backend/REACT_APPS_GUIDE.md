# React Apps Guide - CollabHub

## **🚀 Complete React Development Environment**

Your CollabHub project now includes a complete React development environment that allows you to create, run, and manage React applications directly from your editor and terminal.

## **✨ Features**

### **1. React Project Management**
- ✅ **Create React Projects**: One-click React app creation using `create-react-app`
- ✅ **Run React Apps**: Start development servers with hot reload
- ✅ **Build for Production**: Generate optimized production builds
- ✅ **Install Dependencies**: Manage npm packages
- ✅ **Project Status**: Check project health and configuration

### **2. File Support**
- ✅ **React Components**: `.jsx` and `.tsx` files
- ✅ **JavaScript**: `.js` files with React support
- ✅ **TypeScript**: `.ts` and `.tsx` files
- ✅ **CSS/SCSS**: Styling support
- ✅ **JSON**: Configuration files

### **3. Development Tools**
- ✅ **Hot Reload**: Automatic browser refresh on file changes
- ✅ **Error Overlay**: In-browser error display
- ✅ **Source Maps**: Debug original source code
- ✅ **ESLint**: Code quality checking
- ✅ **Prettier**: Code formatting

## **🎯 How to Run React Apps**

### **Method 1: Using the React Project Manager (Recommended)**

1. **Open the React Project Manager** in your editor
2. **Create a new project**:
   - Enter project name (e.g., `my-react-app`)
   - Click "Create" button
3. **Run the project**:
   - Enter project name/path
   - Set port (default: 3000)
   - Click "Run" button
4. **Access your app**:
   - Click "Open App" button
   - Or visit `http://localhost:3000` in your browser

### **Method 2: Using Terminal Commands**

1. **Create React project**:
   ```bash
   npx create-react-app my-react-app
   cd my-react-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

### **Method 3: Using the Run Button**

1. **Create a React component** (`.jsx` or `.tsx` file)
2. **Click the Run button** (green play icon) next to Save
3. **View output** in the terminal
4. **Follow instructions** to integrate into a full React project

## **📁 Project Structure**

When you create a React project, it will have this structure:

```
my-react-app/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── App.jsx
│   ├── index.js
│   ├── App.css
│   └── index.css
├── package.json
├── README.md
└── .gitignore
```

## **🔧 Available Scripts**

### **Development**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### **Custom Scripts**
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run analyze` - Analyze bundle size

## **🌐 Development Server**

### **Features**
- **Hot Reload**: Changes appear instantly in browser
- **Error Overlay**: Errors displayed in browser
- **Source Maps**: Debug original source code
- **Port Management**: Automatic port selection
- **Network Access**: Accessible from other devices

### **Default Configuration**
- **Port**: 3000
- **Host**: 0.0.0.0 (accessible from network)
- **HTTPS**: Disabled (can be enabled)
- **Proxy**: Configurable for API calls

## **📦 Package Management**

### **Installing Dependencies**
```bash
npm install package-name
npm install --save-dev package-name  # Dev dependencies
```

### **Popular React Packages**
```bash
# Routing
npm install react-router-dom

# State Management
npm install @reduxjs/toolkit react-redux
npm install zustand

# UI Components
npm install @mui/material @emotion/react @emotion/styled
npm install antd
npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion

# Forms
npm install react-hook-form
npm install formik yup

# HTTP Client
npm install axios
npm install @tanstack/react-query

# Icons
npm install lucide-react
npm install react-icons
```

## **🎨 Styling Options**

### **CSS Modules**
```jsx
import styles from './Component.module.css';

function Component() {
  return <div className={styles.container}>Hello</div>;
}
```

### **Styled Components**
```bash
npm install styled-components
```

```jsx
import styled from 'styled-components';

const Button = styled.button`
  background: #007acc;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
`;
```

### **Tailwind CSS**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## **🔍 Debugging**

### **Browser DevTools**
- **React DevTools**: Install browser extension
- **Console**: View logs and errors
- **Network**: Monitor API calls
- **Performance**: Analyze app performance

### **VS Code Debugging**
1. Install "Debugger for Chrome" extension
2. Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

## **🚀 Deployment**

### **Build for Production**
```bash
npm run build
```

### **Deploy Options**
- **Netlify**: Drag and drop `build` folder
- **Vercel**: Connect GitHub repository
- **GitHub Pages**: Use `gh-pages` package
- **AWS S3**: Upload `build` folder
- **Docker**: Create Docker image

## **🔧 Configuration**

### **Environment Variables**
Create `.env` file in project root:
```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_TITLE=My React App
```

### **Package.json Scripts**
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src",
    "format": "prettier --write src"
  }
}
```

## **📚 Best Practices**

### **Component Structure**
```jsx
// components/Button/Button.jsx
import React from 'react';
import './Button.css';

const Button = ({ children, onClick, variant = 'primary' }) => {
  return (
    <button 
      className={`button button--${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
```

### **File Organization**
```
src/
├── components/          # Reusable components
├── pages/              # Page components
├── hooks/              # Custom hooks
├── utils/              # Utility functions
├── services/           # API services
├── styles/             # Global styles
└── assets/             # Images, fonts, etc.
```

### **State Management**
- **Local State**: Use `useState` for component state
- **Global State**: Use Context API or Redux
- **Server State**: Use React Query or SWR

## **🛠️ Troubleshooting**

### **Common Issues**

1. **Port already in use**:
   ```bash
   # Kill process on port 3000
   npx kill-port 3000
   # Or use different port
   PORT=3001 npm start
   ```

2. **Module not found**:
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Build errors**:
   ```bash
   # Clear build cache
   npm run build -- --reset-cache
   ```

4. **Hot reload not working**:
   - Check file extensions (`.jsx`, `.tsx`)
   - Ensure file is in `src` directory
   - Restart development server

### **Performance Issues**
- Use React.memo for expensive components
- Implement code splitting with React.lazy
- Optimize bundle size with webpack-bundle-analyzer
- Use production builds for testing

## **🎯 Next Steps**

1. **Create your first React app** using the React Project Manager
2. **Explore the file structure** and understand each file's purpose
3. **Add your own components** and start building
4. **Install additional packages** as needed
5. **Deploy your app** when ready

## **📞 Support**

If you encounter any issues:
1. Check the terminal output for error messages
2. Review the browser console for JavaScript errors
3. Ensure all dependencies are installed
4. Restart the development server if needed

Your React development environment is now ready! 🚀

