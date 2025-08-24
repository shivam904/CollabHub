# External Compiler Integration

This project now includes seamless external compiler integration that allows users to compile and run code directly from the editor with output displayed in the terminal.

## Features

- ✅ **Multi-language Support**: JavaScript, Python, Java, C++, C, Go, Rust, PHP, Ruby
- ✅ **One-click Execution**: Run button next to Save button
- ✅ **Terminal Output**: Results displayed in the integrated terminal
- ✅ **Performance Metrics**: Execution time and memory usage
- ✅ **Error Handling**: Clear error messages for compilation failures
- ✅ **Keyboard Shortcuts**: Ctrl+R to run code

## Setup

### 1. API Credentials

The external compiler uses JDoodle API. You need to:

1. Sign up at [JDoodle](https://www.jdoodle.com/)
2. Get your Client ID and Client Secret
3. Add them to your environment variables:

```bash
# .env file
JDOODLE_CLIENT_ID=your_client_id_here
JDOODLE_CLIENT_SECRET=your_client_secret_here
```

### 2. Supported File Types

The system automatically detects supported file types:

- `.js` - JavaScript (Node.js)
- `.py` - Python 3
- `.java` - Java
- `.cpp` - C++
- `.c` - C
- `.go` - Go
- `.rs` - Rust
- `.php` - PHP
- `.rb` - Ruby

## Usage

### Frontend

1. **Open a supported file** in the editor
2. **Click the Run button** (green play icon) next to the Save button
3. **Or use Ctrl+R** keyboard shortcut
4. **View results** in the terminal panel

### Backend API

```javascript
// Compile and execute code
POST /api/compiler/execute
{
  "fileName": "hello.js",
  "code": "console.log('Hello World!');",
  "input": "",
  "userId": "user123"
}

// Check if file type is supported
GET /api/compiler/support/hello.js

// Get supported languages
GET /api/compiler/languages
```

## Architecture

### Components

1. **External Compiler Service** (`services/externalCompiler.js`)
   - Handles API communication with JDoodle
   - Manages language configurations
   - Provides compilation and execution

2. **Compiler Controller** (`Controllers/compilerController.js`)
   - REST API endpoints
   - Request validation
   - Response formatting

3. **Frontend Integration**
   - Run button in CodeEditor
   - Terminal output display
   - Keyboard shortcuts

### Flow

1. User clicks Run button
2. Frontend sends code to `/api/compiler/execute`
3. Backend validates and sends to JDoodle API
4. Results are returned and displayed in terminal
5. Performance metrics shown

## Testing

Run the integration test:

```bash
cd backend
node test-compiler-integration.js
```

## Error Handling

- **Unsupported file types**: Clear error message
- **API failures**: Graceful fallback with error details
- **Network issues**: Timeout handling
- **Invalid code**: Compilation error display

## Performance

- **Execution time**: Typically 1-5 seconds
- **Memory usage**: Limited by API provider
- **Rate limiting**: Respects API limits
- **Caching**: No caching (fresh execution each time)

## Security

- **Input validation**: All inputs sanitized
- **API credentials**: Stored in environment variables
- **User authentication**: Required for execution
- **Code isolation**: Executed in sandboxed environment

## Future Enhancements

- [ ] Local compilation for faster execution
- [ ] Custom input support
- [ ] File upload support
- [ ] Batch execution
- [ ] Code templates
- [ ] Execution history

