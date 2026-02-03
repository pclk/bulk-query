# bulk-query — Project Instructions Guide

## Overview

**bulk-query** is a single-session web application that processes large text inputs (1,000–6,000 words) through AI operations. Users define a task, paste text, review/adjust AI-generated section breaks, and process each chunk—with results displayed in real-time.

---

## Core User Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Step 1     │────▶│  Step 2     │────▶│  Step 3     │────▶│  Step 4     │
│  Define     │     │  Input      │     │  Chunk      │     │  Process    │
│  Task       │     │  Text       │     │  & Adjust   │     │  & Export   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Functional Specification

### Step 1: Task Definition

| Feature | Description |
|---------|-------------|
| Free-form input | Textarea for custom instructions (e.g., "Translate to Spanish", "Convert to bullet points") |
| Predefined templates | Quick-select buttons: Translate, Summarize, Flashcards, Format, Custom |
| Template saving | Users can save current prompt as a named template (stored in React state for session) |
| Template management | List saved templates, load, delete |

### Step 2: Text Input

| Feature | Description |
|---------|-------------|
| Paste area | Large textarea for pasting 1,000–6,000 words |
| Word count | Live word count display with soft warnings outside range |
| Clear button | Reset textarea |

### Step 3: Chunking Interface

#### AI Chunking Request

The system sends text to AI with instructions to return chunks in this format:

```json
{
  "chunks": [
    {
      "title": "<3-7 word topic>",
      "start": "<first 5-8 words verbatim>",
      "end": "<last 5-8 words verbatim>",
      "lines": [<startLine>, <endLine>],
      "ctx": "<15-30 word context preamble OR null>"
    }
  ]
}
```

#### Chunk Editor UI

| Feature | Description |
|---------|-------------|
| Continuous text view | Full text displayed with visual break indicators between chunks |
| Break adjustment | Drag break lines up/down to adjust where sections split |
| Merge chunks | Select two adjacent chunks → merge into one |
| Split chunk | Click within a chunk to insert a new break point |
| Chunk cards | Sidebar or overlay showing chunk titles with word counts |
| Size indicators | Visual warnings: 🔴 <150 words, 🟢 150-750 words, 🟡 >750 words |
| Context preview | Show/edit the `ctx` preamble for each chunk |

### Step 4: Processing

| Feature | Description |
|---------|-------------|
| Processing mode toggle | Sequential (default) vs. Parallel — visible in UI |
| Progress indicator | Shows: "Processing chunk 3/8..." with spinner per chunk |
| Real-time results | Each chunk's output appears immediately upon completion |
| Error handling | On failure: skip chunk, append its text to previous chunk, mark as "merged due to error" |
| Results display | Original text replaced with processed output, maintaining chunk boundaries |

### Step 5: Export

| Feature | Description |
|---------|-------------|
| Copy all | Single button copies entire processed output to clipboard |
| Copy per chunk | Copy individual chunk results |
| Flashcard format | When task = flashcards, output Anki-compatible format: `front;back` per line |

---

## UI/UX Specifications

| Aspect | Specification |
|--------|---------------|
| Theme | Dark mode only |
| Style | Minimal, playful (subtle animations, rounded corners, gentle hover states) |
| Typography | Monospace for text content, sans-serif for UI elements |
| Color palette | Dark grays (#0d0d0d, #1a1a1a, #2a2a2a), accent color (suggest: soft purple or teal) |
| Feedback | Toast notifications for actions, skeleton loaders during AI calls |

---

## Data Structures

### State Shape

```typescript
interface AppState {
  // Step 1
  taskPrompt: string;
  savedTemplates: Template[];
  
  // Step 2
  rawText: string;
  
  // Step 3
  chunks: Chunk[];
  isChunking: boolean;
  
  // Step 4
  processingMode: 'sequential' | 'parallel';
  processingStatus: ProcessingStatus;
  results: ChunkResult[];
  
  // Navigation
  currentStep: 1 | 2 | 3 | 4;
}

interface Template {
  id: string;
  name: string;
  prompt: string;
}

interface Chunk {
  id: string;
  title: string;
  start: string;
  end: string;
  lines: [number, number];
  ctx: string | null;
  text: string; // derived from lines
  wordCount: number;
}

interface ChunkResult {
  chunkId: string;
  status: 'pending' | 'processing' | 'complete' | 'error' | 'merged';
  output: string | null;
}
```

---

## Task List

### Phase 1: Foundation
- [ ] **1.1** Set up React artifact with dark theme base styles
- [ ] **1.2** Create app shell with step indicator/navigation
- [ ] **1.3** Implement state management structure
- [ ] **1.4** Build reusable UI components (Button, Textarea, Card, Toast)

### Phase 2: Task Definition (Step 1)
- [ ] **2.1** Build task prompt textarea with placeholder examples
- [ ] **2.2** Add predefined template buttons (Translate, Summarize, Flashcards, Format)
- [ ] **2.3** Implement "Save as template" functionality
- [ ] **2.4** Build saved templates list with load/delete actions
- [ ] **2.5** Add "Next" button with validation (prompt required)

### Phase 3: Text Input (Step 2)
- [ ] **3.1** Build large textarea for text pasting
- [ ] **3.2** Add live word count display
- [ ] **3.3** Add visual indicators for word count ranges (too short/ideal/too long)
- [ ] **3.4** Implement clear button
- [ ] **3.5** Add "Back" and "Chunk Text" buttons

### Phase 4: Chunking Interface (Step 3)
- [ ] **4.1** Build AI chunking API call with proper prompt
- [ ] **4.2** Parse AI response and derive full text for each chunk
- [ ] **4.3** Build continuous text view with break line indicators
- [ ] **4.4** Implement draggable break points
- [ ] **4.5** Build chunk sidebar with titles and word counts
- [ ] **4.6** Add size indicator badges (🔴🟢🟡)
- [ ] **4.7** Implement merge functionality (select two → combine)
- [ ] **4.8** Implement split functionality (click to insert break)
- [ ] **4.9** Add context (`ctx`) preview and edit capability
- [ ] **4.10** Add "Back" and "Process" buttons

### Phase 5: Processing (Step 4)
- [ ] **5.1** Build processing mode toggle (sequential/parallel)
- [ ] **5.2** Implement sequential processing with real-time updates
- [ ] **5.3** Implement parallel processing option
- [ ] **5.4** Build progress indicator UI
- [ ] **5.5** Handle errors: skip and merge with previous chunk
- [ ] **5.6** Display results replacing original text
- [ ] **5.7** Maintain chunk boundaries in results view

### Phase 6: Export
- [ ] **6.1** Implement "Copy All" button
- [ ] **6.2** Implement per-chunk copy buttons
- [ ] **6.3** Format flashcard output as Anki-compatible (`front;back`)
- [ ] **6.4** Add success toast on copy

### Phase 7: Polish
- [ ] **7.1** Add loading skeletons and animations
- [ ] **7.2** Implement toast notification system
- [ ] **7.3** Add keyboard shortcuts (Cmd+Enter to proceed, etc.)
- [ ] **7.4** Final styling pass (spacing, transitions, hover states)
- [ ] **7.5** Edge case handling (empty chunks, API failures, etc.)

---

## Prompts to Prepare

1. **Chunking prompt** — Instructs AI to analyze text and return JSON with chunk boundaries
2. **Processing prompt wrapper** — Template that injects user's task + chunk context + chunk text