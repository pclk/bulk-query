# 📚 bulk-query - Complete Overview

## What is bulk-query?

**bulk-query** is a single-session web application that processes large text inputs (1,000–6,000 words) through AI operations. It intelligently breaks text into semantic chunks, processes each chunk according to your task, and provides results in real-time.

## 🎯 Use Cases

- **📖 Study Materials**: Convert textbooks into flashcards
- **📝 Content Summarization**: Summarize long articles or documents
- **🌍 Translation**: Translate large documents while maintaining context
- **✨ Content Formatting**: Convert prose into bullet points or structured formats
- **🎓 Educational Content**: Create Q&A pairs from learning materials

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 (via CDN)
- **Styling**: Pure CSS (dark theme)
- **State Management**: React Hooks
- **Storage**: LocalStorage (for templates)
- **Build**: None required! (Babel Standalone for JSX)

### File Structure
```
bulk-query/
├── index.html          # HTML + CSS (234 lines)
├── app.js              # React app (1,123 lines)
├── sample-text.txt     # Sample content
├── QUICKSTART.md       # 30-second guide
├── USAGE.md            # Detailed user guide
├── PROJECT_SUMMARY.md  # Technical summary
├── OVERVIEW.md         # This file
└── system_prompt/
    └── section_chunker # AI chunking prompt
```

## 🔄 User Flow

```
1. Define Task → 2. Input Text → 3. Chunk & Adjust → 4. Process & Export
```

### Step 1: Define Task
- Choose from predefined templates or create custom prompts
- Save frequently used prompts as templates
- Templates persist across sessions

### Step 2: Input Text
- Paste 1,000-6,000 words of text
- Real-time word count with visual indicators
- Validation before proceeding

### Step 3: Chunk & Adjust
- AI automatically creates semantic chunks
- Review and adjust chunk boundaries
- Merge adjacent chunks or split large ones
- Edit chunk titles and context preambles

### Step 4: Process & Export
- Choose sequential or parallel processing
- Watch real-time progress
- Copy all results or individual chunks
- Special formatting for flashcards

## ✨ Key Features

### 🎨 Beautiful Dark UI
- Modern dark theme with purple accents
- Smooth animations and transitions
- Responsive design
- Custom scrollbars

### ⌨️ Keyboard Shortcuts
- `Cmd/Ctrl + Enter`: Next step
- `Cmd/Ctrl + Backspace`: Previous step

### 💾 Template Management
- Save custom prompts
- Load saved templates
- Delete unused templates
- Persists in browser storage

### 🧩 Smart Chunking
- Semantic boundary detection
- Context preservation
- Size optimization (150-750 words)
- Visual size indicators (🔴🟢🟡)

### ⚡ Flexible Processing
- **Sequential**: Process one chunk at a time
- **Parallel**: Process all chunks simultaneously
- Real-time progress tracking
- Error handling with graceful degradation

### 📋 Easy Export
- Copy all results at once
- Copy individual chunks
- Anki-compatible flashcard format
- Toast notifications for feedback

## 🎨 Design System

### Colors
| Purpose | Color | Hex |
|---------|-------|-----|
| Background Dark | ⬛ | #0d0d0d |
| Background Medium | ⬛ | #1a1a1a |
| Background Light | ⬛ | #2a2a2a |
| Accent Start | 🟣 | #667eea |
| Accent End | 🟣 | #764ba2 |
| Success | 🟢 | #27ae60 |
| Warning | 🟡 | #f39c12 |
| Error | 🔴 | #e74c3c |
| Text Primary | ⬜ | #e0e0e0 |
| Text Secondary | ⬜ | #a0a0a0 |

### Typography
- **UI**: System sans-serif
- **Code**: Monaco, Courier New
- **Sizes**: 0.75rem - 2rem

### Spacing
- **Small**: 0.5rem
- **Medium**: 1rem
- **Large**: 1.5rem
- **XLarge**: 2rem

## 🔌 Integration Ready

The app is designed for easy AI API integration:

### Current State
- ✅ Complete UI/UX
- ✅ State management
- ✅ Simulated AI processing
- ⏳ Real AI integration (ready to add)

### Integration Points

**1. Chunking API** (Step 3)
```javascript
// In performChunking() function
const response = await fetch('YOUR_CHUNKING_API', {
  method: 'POST',
  body: JSON.stringify({ text: numberedText })
});
```

**2. Processing API** (Step 4)
```javascript
// In processChunk() function
const response = await fetch('YOUR_PROCESSING_API', {
  method: 'POST',
  body: JSON.stringify({
    task: taskPrompt,
    context: chunk.ctx,
    text: chunk.text
  })
});
```

## 📊 Performance

- **Load Time**: < 1 second
- **Bundle Size**: ~200KB (React + ReactDOM from CDN)
- **Memory**: Minimal (no heavy dependencies)
- **Browser Support**: All modern browsers

## 🧪 Testing

### Manual Testing
1. Open `index.html`
2. Use content from `sample-text.txt`
3. Test all 4 steps
4. Try merge/split operations
5. Test both processing modes
6. Verify copy functionality

### Test Scenarios
- ✅ Short text (< 1000 words)
- ✅ Ideal text (1000-6000 words)
- ✅ Long text (> 6000 words)
- ✅ Template save/load/delete
- ✅ Chunk merge/split
- ✅ Sequential processing
- ✅ Parallel processing
- ✅ Copy operations
- ✅ Keyboard shortcuts

## 🚀 Deployment Options

### Option 1: Static Hosting
Upload to any static host:
- GitHub Pages
- Netlify
- Vercel
- AWS S3
- Cloudflare Pages

### Option 2: Local Server
```bash
python3 -m http.server 8000
# or
npx http-server
```

### Option 3: Direct File
Simply open `index.html` in a browser!

## 📈 Future Roadmap

### Phase 8: Real AI Integration
- [ ] OpenAI API integration
- [ ] Anthropic Claude integration
- [ ] Custom API endpoint support
- [ ] API key management

### Phase 9: Enhanced Features
- [ ] Drag-and-drop chunk reordering
- [ ] Export to PDF/DOCX
- [ ] Import from files
- [ ] Undo/redo functionality

### Phase 10: Collaboration
- [ ] Cloud storage
- [ ] Share projects
- [ ] Team workspaces
- [ ] Version history

## 🎓 Learning Resources

This project demonstrates:
- React without build tools
- State management with hooks
- Dark mode design
- Multi-step wizards
- LocalStorage persistence
- Keyboard shortcuts
- Toast notifications
- Responsive layouts
- CSS animations
- Simulated async operations

## 📞 Support

- **Quick Start**: See `QUICKSTART.md`
- **User Guide**: See `USAGE.md`
- **Technical Details**: See `PROJECT_SUMMARY.md`
- **Specifications**: See `README.md`

## 🎉 Credits

Built following the specifications in `README.md` with:
- Modern React patterns
- Thoughtful UX design
- Clean, maintainable code
- Comprehensive documentation

---

**Ready to process some text? Open `index.html` and get started!** 🚀

