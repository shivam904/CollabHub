# JDoodle API Setup Guide

## **🚀 Quick Setup (Required for External Compiler)**

### **Step 1: Sign Up for JDoodle**
1. Visit [https://www.jdoodle.com/](https://www.jdoodle.com/)
2. Click "Sign Up" or "Register"
3. Create a free account with your email

### **Step 2: Get API Credentials**
1. **Login** to your JDoodle account
2. Go to **Dashboard** or **API** section
3. Look for **"API Credentials"** or **"Developer"** section
4. You'll find:
   - **Client ID** (looks like: `abc123def456`)
   - **Client Secret** (looks like: `xyz789uvw012`)

### **Step 3: Add to Environment Variables**
1. In your `backend` folder, create or edit `.env` file
2. Add these lines:

```bash
# JDoodle API Credentials
JDOODLE_CLIENT_ID=your_actual_client_id_here
JDOODLE_CLIENT_SECRET=your_actual_client_secret_here
```

### **Step 4: Restart Your Backend**
```bash
cd backend
npm start
```

## **✅ Verification**

After setup, you can test if it's working:

1. **Create a test file** (e.g., `hello.js`) in your editor
2. **Add some code**:
   ```javascript
   console.log("Hello from JDoodle!");
   ```
3. **Click the Run button** (green play icon)
4. **Check the terminal** for output

## **🔍 Troubleshooting**

### **If you get "API credentials not found" error:**
- Make sure your `.env` file is in the `backend` folder
- Check that the variable names are exactly: `JDOODLE_CLIENT_ID` and `JDOODLE_CLIENT_SECRET`
- Restart your backend server

### **If you get "Authentication failed" error:**
- Double-check your Client ID and Client Secret
- Make sure you copied them correctly from JDoodle dashboard
- Ensure there are no extra spaces in your `.env` file

### **If the Run button doesn't appear:**
- Make sure you're editing a supported file type (`.js`, `.py`, `.java`, etc.)
- Check the browser console for any errors
- Verify the backend is running properly

## **📋 Supported File Types**

The Run button will only appear for these file types:
- `.js` - JavaScript
- `.py` - Python
- `.java` - Java
- `.cpp` - C++
- `.c` - C
- `.go` - Go
- `.rs` - Rust
- `.php` - PHP
- `.rb` - Ruby

## **💰 Free Tier Limits**

JDoodle free tier includes:
- **200 API calls per day**
- **Basic language support**
- **Standard execution time**

For more usage, consider upgrading to a paid plan.

## **🔒 Security Note**

- Never commit your `.env` file to version control
- Keep your API credentials secure
- The `.env` file should be in your `.gitignore`

## **🎯 Next Steps**

Once setup is complete:
1. Create a test file in your editor
2. Write some code
3. Click the Run button
4. See the output in the terminal!

The external compiler will now work seamlessly with your CollabHub editor! 🚀

