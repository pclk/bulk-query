# bulk-query - Usage Guide

## Running the Application

The application is a single-page web app that runs entirely in the browser. No build process or server required!

### Quick Start

1. Open `index.html` in your web browser
2. That's it! The app is ready to use.

### Alternative: Using a Local Server

If you prefer to use a local server:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have http-server installed)
npx http-server
```

Then open `http://localhost:8000` in your browser.

## How to Use

### Step 1: Define Your Task

1. Enter a custom prompt or select a predefined template:
   - **Translate**: Convert text to another language
   - **Summarize**: Create concise summaries
   - **Flashcards**: Generate Q&A flashcards
   - **Format**: Convert to bullet points

2. Save custom prompts as templates for reuse
3. Click "Next" to proceed

**Keyboard Shortcut**: `Cmd/Ctrl + Enter` to proceed

### Step 2: Input Text

1. Paste your text (recommended: 1,000-6,000 words)
2. Monitor the word count indicator:
   - 🔴 Red: Below 1,000 words
   - 🟢 Green: 1,000-6,000 words (ideal)
   - 🟡 Yellow: Above 6,000 words

3. Click "Chunk Text" to proceed

**Sample Text**: Use the content from `sample-text.txt` to test the app

### Step 3: Review & Adjust Chunks

The AI automatically divides your text into semantic chunks. You can:

- **View chunks**: See all chunks in the sidebar with word counts
- **Select chunks**: Click to select (for merging)
- **Merge chunks**: Select 2 adjacent chunks and click "Merge"
- **Split chunks**: Click "Split" on any chunk to divide it
- **Edit titles**: Click on chunk titles to rename them
- **Edit context**: Click on context preambles to edit them

**Size Indicators**:
- 🔴 Red: <150 words (too small)
- 🟢 Green: 150-750 words (ideal)
- 🟡 Yellow: >750 words (large)

### Step 4: Process & Export

1. Choose processing mode:
   - **Sequential**: Process chunks one at a time (default)
   - **Parallel**: Process all chunks simultaneously

2. Watch real-time progress as chunks are processed

3. Export results:
   - **Copy All**: Copy all processed chunks
   - **Copy Individual**: Copy specific chunks

**Note**: The current implementation uses simulated AI processing. In a production version, this would connect to a real AI API (OpenAI, Anthropic, etc.).

## Features

### Keyboard Shortcuts

- `Cmd/Ctrl + Enter`: Proceed to next step
- `Cmd/Ctrl + Backspace`: Go back to previous step

### Template Management

- Templates are saved in browser localStorage
- Persist across sessions
- Can be loaded, edited, and deleted

### Smart Chunking

The chunking algorithm:
- Identifies semantic boundaries
- Maintains context between chunks
- Provides size indicators
- Allows manual adjustment

### Processing Modes

- **Sequential**: Safer, shows progress clearly, easier to debug
- **Parallel**: Faster for large documents, processes all chunks at once

## Customization

### Connecting to Real AI APIs

To connect to a real AI service, modify the `processChunk` function in `app.js`:

```javascript
const processChunk = async (chunk) => {
  const response = await fetch('YOUR_AI_API_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({
      prompt: taskPrompt,
      context: chunk.ctx,
      text: chunk.text
    })
  });
  
  const data = await response.json();
  return data.output;
};
```

### Styling

All styles are in `index.html`. The color scheme uses:
- Background: `#0d0d0d`, `#1a1a1a`, `#2a2a2a`
- Accent: Purple gradient (`#667eea` to `#764ba2`)
- Success: `#27ae60`
- Warning: `#f39c12`
- Error: `#e74c3c`

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE11: ❌ Not supported (uses modern JavaScript)

## Tips

1. **For best results**: Use text between 1,000-6,000 words
2. **Chunk size**: Aim for 150-750 words per chunk
3. **Context preambles**: Edit these to improve AI understanding
4. **Save templates**: Create templates for frequently used tasks
5. **Review chunks**: Always review AI-generated chunks before processing

## Troubleshooting

**Chunks too small/large?**
- Use the merge/split functions to adjust
- Aim for the green 🟢 indicator

**Processing taking too long?**
- Try parallel mode for faster processing
- Consider splitting large chunks first

**Lost your work?**
- Templates are saved automatically
- Use "Back" buttons to navigate without losing data
- Refresh the page to start over

## Next Steps

To enhance this application:

1. **Add real AI integration** (OpenAI, Anthropic, etc.)
2. **Implement drag-and-drop** for chunk reordering
3. **Add export formats** (PDF, DOCX, Markdown)
4. **Create user accounts** for cloud storage
5. **Add collaboration features** for team use

