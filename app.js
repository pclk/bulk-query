const { useState, useEffect, useRef } = React;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateId = () => Math.random().toString(36).substr(2, 9);

const countWords = (text) => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

const getWordCountStatus = (count) => {
  if (count < 1000) return { status: 'low', color: '#e74c3c', message: 'Below recommended range' };
  if (count > 6000) return { status: 'high', color: '#f39c12', message: 'Above recommended range' };
  return { status: 'good', color: '#27ae60', message: 'Ideal range' };
};

const getSizeIndicator = (wordCount) => {
  if (wordCount < 150) return { emoji: '🔴', color: '#e74c3c' };
  if (wordCount > 750) return { emoji: '🟡', color: '#f39c12' };
  return { emoji: '🟢', color: '#27ae60' };
};

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className="toast">
          {toast.message}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// STEP INDICATOR
// ============================================================================

const StepIndicator = ({ currentStep, completedSteps, onStepClick }) => {
  const steps = [
    { num: 1, label: 'Define Task' },
    { num: 2, label: 'Input Text' },
    { num: 3, label: 'Chunk & Adjust' },
    { num: 4, label: 'Process & Export' }
  ];

  return (
    <div className="step-indicator">
      {steps.map(step => (
        <div
          key={step.num}
          className={`step ${currentStep === step.num ? 'active' : ''} ${completedSteps.includes(step.num) ? 'completed' : ''}`}
          onClick={() => onStepClick(step.num)}
        >
          <div className="step-number">{step.num}</div>
          <div className="step-label">{step.label}</div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// STEP 1: TASK DEFINITION
// ============================================================================

const PREDEFINED_TEMPLATES = [
  { id: 'translate', name: 'Translate', prompt: 'Translate the following text to [TARGET LANGUAGE]:' },
  { id: 'summarize', name: 'Summarize', prompt: 'Provide a concise summary of the following text, highlighting key points:' },
  { id: 'flashcards', name: 'Flashcards', prompt: 'Convert the following text into flashcards. Format each as "Question;Answer" on separate lines:' },
  { id: 'format', name: 'Format', prompt: 'Reformat the following text into clear, organized bullet points:' }
];

const Step1TaskDefinition = ({ taskPrompt, setTaskPrompt, savedTemplates, setSavedTemplates, onNext, showToast }) => {
  const [templateName, setTemplateName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const loadTemplate = (template) => {
    setTaskPrompt(template.prompt);
    showToast(`Loaded template: ${template.name}`);
  };

  const saveTemplate = () => {
    if (!templateName.trim()) {
      showToast('Please enter a template name');
      return;
    }
    if (!taskPrompt.trim()) {
      showToast('Please enter a prompt first');
      return;
    }
    const newTemplate = {
      id: generateId(),
      name: templateName,
      prompt: taskPrompt
    };
    setSavedTemplates(prev => [...prev, newTemplate]);
    showToast(`Template "${templateName}" saved!`);
    setTemplateName('');
    setShowSaveDialog(false);
  };

  const deleteTemplate = (id) => {
    setSavedTemplates(prev => prev.filter(t => t.id !== id));
    showToast('Template deleted');
  };

  const handleNext = () => {
    if (!taskPrompt.trim()) {
      showToast('Please enter a task prompt');
      return;
    }
    onNext();
  };

  return (
    <div className="step-content">
      <div className="card">
        <h2 className="card-title">Define Your Task</h2>
        <p style={{ marginBottom: '1.5rem', color: '#a0a0a0' }}>
          Describe what you want to do with your text (e.g., translate, summarize, create flashcards)
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {PREDEFINED_TEMPLATES.map(template => (
              <button
                key={template.id}
                className="button small secondary"
                onClick={() => loadTemplate(template)}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="textarea"
          value={taskPrompt}
          onChange={(e) => setTaskPrompt(e.target.value)}
          placeholder="Enter your custom instructions here..."
          rows={8}
          style={{ marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            className="button secondary small"
            onClick={() => setShowSaveDialog(!showSaveDialog)}
          >
            💾 Save as Template
          </button>
        </div>

        {showSaveDialog && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#2a2a2a', borderRadius: '8px' }}>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name..."
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#1a1a1a',
                border: '2px solid #3a3a3a',
                borderRadius: '6px',
                color: '#e0e0e0',
                marginBottom: '0.75rem'
              }}
            />
            <button className="button small" onClick={saveTemplate}>
              Save Template
            </button>
          </div>
        )}

        {savedTemplates.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#c0c0c0' }}>Saved Templates</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {savedTemplates.map(template => (
                <div
                  key={template.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    borderRadius: '6px'
                  }}
                >
                  <span>{template.name}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="button small secondary"
                      onClick={() => loadTemplate(template)}
                    >
                      Load
                    </button>
                    <button
                      className="button small danger"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="button" onClick={handleNext}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STEP 2: TEXT INPUT
// ============================================================================

const Step2TextInput = ({ rawText, setRawText, onNext, onBack, showToast }) => {
  const wordCount = countWords(rawText);
  const wordStatus = getWordCountStatus(wordCount);

  const handleClear = () => {
    setRawText('');
    showToast('Text cleared');
  };

  const handleNext = () => {
    if (!rawText.trim()) {
      showToast('Please paste some text first');
      return;
    }
    if (wordCount < 100) {
      showToast('Text is too short for chunking');
      return;
    }
    onNext();
  };

  return (
    <div className="step-content">
      <div className="card">
        <h2 className="card-title">Input Your Text</h2>
        <p style={{ marginBottom: '1.5rem', color: '#a0a0a0' }}>
          Paste the text you want to process (recommended: 1,000-6,000 words)
        </p>

        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>
              {wordCount.toLocaleString()} words
            </span>
            <span style={{ color: wordStatus.color, fontSize: '0.875rem' }}>
              {wordStatus.message}
            </span>
          </div>
          <button className="button small secondary" onClick={handleClear}>
            Clear
          </button>
        </div>

        <textarea
          className="textarea"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste your text here..."
          rows={20}
          style={{ marginBottom: '1.5rem' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="button secondary" onClick={onBack}>
            ← Back
          </button>
          <button className="button" onClick={handleNext}>
            Chunk Text →
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STEP 3: CHUNKING INTERFACE
// ============================================================================

const Step3Chunking = ({ rawText, taskPrompt, chunks, setChunks, isChunking, setIsChunking, onNext, onBack, showToast }) => {
  const [selectedChunks, setSelectedChunks] = useState([]);
  const [editingCtx, setEditingCtx] = useState(null);

  // Simulate AI chunking (in real app, this would call an API)
  const performChunking = async () => {
    setIsChunking(true);
    showToast('Analyzing text and creating chunks...');

    // Add line numbers to text
    const lines = rawText.split('\n');
    const numberedText = lines.map((line, i) => `[L${i + 1}] ${line}`).join('\n');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simple chunking algorithm (in real app, this would use AI)
    const paragraphs = rawText.split('\n\n').filter(p => p.trim());
    const newChunks = [];
    let currentLine = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      const paraLines = para.split('\n').length;
      const words = countWords(para);

      if (words > 50) { // Only create chunks for substantial paragraphs
        const paraWords = para.trim().split(/\s+/);
        const start = paraWords.slice(0, Math.min(7, paraWords.length)).join(' ');
        const end = paraWords.slice(-Math.min(7, paraWords.length)).join(' ');

        newChunks.push({
          id: generateId(),
          title: `Section ${newChunks.length + 1}`,
          start: start,
          end: end,
          lines: [currentLine + 1, currentLine + paraLines],
          ctx: i > 0 ? 'Continuation of previous discussion' : null,
          text: para,
          wordCount: words
        });
      }

      currentLine += paraLines + 1; // +1 for the blank line
    }

    setChunks(newChunks);
    setIsChunking(false);
    showToast(`Created ${newChunks.length} chunks`);
  };

  useEffect(() => {
    if (chunks.length === 0 && !isChunking) {
      performChunking();
    }
  }, []);

  const mergeChunks = () => {
    if (selectedChunks.length !== 2) {
      showToast('Please select exactly 2 adjacent chunks to merge');
      return;
    }

    const indices = selectedChunks.map(id => chunks.findIndex(c => c.id === id)).sort((a, b) => a - b);

    if (indices[1] - indices[0] !== 1) {
      showToast('Can only merge adjacent chunks');
      return;
    }

    const chunk1 = chunks[indices[0]];
    const chunk2 = chunks[indices[1]];

    const merged = {
      id: generateId(),
      title: chunk1.title,
      start: chunk1.start,
      end: chunk2.end,
      lines: [chunk1.lines[0], chunk2.lines[1]],
      ctx: chunk1.ctx,
      text: chunk1.text + '\n\n' + chunk2.text,
      wordCount: chunk1.wordCount + chunk2.wordCount
    };

    const newChunks = [...chunks];
    newChunks.splice(indices[0], 2, merged);
    setChunks(newChunks);
    setSelectedChunks([]);
    showToast('Chunks merged');
  };

  const splitChunk = (chunkId) => {
    const index = chunks.findIndex(c => c.id === chunkId);
    const chunk = chunks[index];

    if (chunk.wordCount < 100) {
      showToast('Chunk too small to split');
      return;
    }

    const words = chunk.text.split(/\s+/);
    const midPoint = Math.floor(words.length / 2);
    const text1 = words.slice(0, midPoint).join(' ');
    const text2 = words.slice(midPoint).join(' ');

    const chunk1 = {
      id: generateId(),
      title: chunk.title + ' (Part 1)',
      start: chunk.start,
      end: text1.split(/\s+/).slice(-7).join(' '),
      lines: [chunk.lines[0], chunk.lines[0] + Math.floor((chunk.lines[1] - chunk.lines[0]) / 2)],
      ctx: chunk.ctx,
      text: text1,
      wordCount: countWords(text1)
    };

    const chunk2 = {
      id: generateId(),
      title: chunk.title + ' (Part 2)',
      start: text2.split(/\s+/).slice(0, 7).join(' '),
      end: chunk.end,
      lines: [chunk1.lines[1] + 1, chunk.lines[1]],
      ctx: 'Continuation of ' + chunk.title,
      text: text2,
      wordCount: countWords(text2)
    };

    const newChunks = [...chunks];
    newChunks.splice(index, 1, chunk1, chunk2);
    setChunks(newChunks);
    showToast('Chunk split');
  };

  const toggleChunkSelection = (chunkId) => {
    setSelectedChunks(prev =>
      prev.includes(chunkId)
        ? prev.filter(id => id !== chunkId)
        : [...prev, chunkId]
    );
  };

  const updateChunkTitle = (chunkId, newTitle) => {
    setChunks(prev => prev.map(c =>
      c.id === chunkId ? { ...c, title: newTitle } : c
    ));
  };

  const updateChunkCtx = (chunkId, newCtx) => {
    setChunks(prev => prev.map(c =>
      c.id === chunkId ? { ...c, ctx: newCtx || null } : c
    ));
    setEditingCtx(null);
    showToast('Context updated');
  };

  const handleNext = () => {
    if (chunks.length === 0) {
      showToast('No chunks available');
      return;
    }
    onNext();
  };

  if (isChunking) {
    return (
      <div className="step-content">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
          <h2>Analyzing text...</h2>
          <p style={{ color: '#a0a0a0', marginTop: '0.5rem' }}>Creating semantic chunks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="step-content">
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
        {/* Chunk Sidebar */}
        <div>
          <div className="card">
            <h3 className="card-title" style={{ fontSize: '1rem' }}>Chunks ({chunks.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                className="button small secondary"
                onClick={mergeChunks}
                disabled={selectedChunks.length !== 2}
              >
                Merge
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto' }}>
              {chunks.map((chunk, index) => {
                const indicator = getSizeIndicator(chunk.wordCount);
                return (
                  <div
                    key={chunk.id}
                    style={{
                      padding: '0.75rem',
                      background: selectedChunks.includes(chunk.id) ? '#3a3a5a' : '#2a2a2a',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: selectedChunks.includes(chunk.id) ? '2px solid #667eea' : '2px solid transparent'
                    }}
                    onClick={() => toggleChunkSelection(chunk.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{chunk.title}</span>
                      <span style={{ fontSize: '1.25rem' }}>{indicator.emoji}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a0a0a0' }}>
                      {chunk.wordCount} words
                    </div>
                    <button
                      className="button small secondary"
                      style={{ marginTop: '0.5rem', width: '100%' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        splitChunk(chunk.id);
                      }}
                    >
                      Split
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="card">
          <h2 className="card-title">Review & Adjust Chunks</h2>
          <p style={{ marginBottom: '1.5rem', color: '#a0a0a0' }}>
            Click chunks in the sidebar to select them. Select 2 adjacent chunks to merge, or click Split to divide a chunk.
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            {chunks.map((chunk, index) => (
              <div key={chunk.id} style={{ marginBottom: '2rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  background: '#2a2a2a',
                  borderRadius: '6px'
                }}>
                  <input
                    type="text"
                    value={chunk.title}
                    onChange={(e) => updateChunkTitle(chunk.id, e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#e0e0e0',
                      fontSize: '1rem',
                      fontWeight: '600',
                      flex: 1
                    }}
                  />
                  <span style={{ fontSize: '0.875rem', color: '#a0a0a0' }}>
                    {chunk.wordCount} words {getSizeIndicator(chunk.wordCount).emoji}
                  </span>
                </div>

                {chunk.ctx && (
                  <div style={{
                    padding: '0.75rem',
                    background: '#1a2a3a',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontStyle: 'italic',
                    color: '#a0c0e0'
                  }}>
                    Context: {editingCtx === chunk.id ? (
                      <input
                        type="text"
                        value={chunk.ctx}
                        onChange={(e) => updateChunkCtx(chunk.id, e.target.value)}
                        onBlur={() => setEditingCtx(null)}
                        autoFocus
                        style={{
                          background: '#2a3a4a',
                          border: '1px solid #3a4a5a',
                          color: '#e0e0e0',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          width: '100%',
                          marginTop: '0.25rem'
                        }}
                      />
                    ) : (
                      <span onClick={() => setEditingCtx(chunk.id)} style={{ cursor: 'pointer' }}>
                        {chunk.ctx}
                      </span>
                    )}
                  </div>
                )}

                <div style={{
                  padding: '1rem',
                  background: '#1a1a1a',
                  borderRadius: '6px',
                  fontFamily: 'Monaco, monospace',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {chunk.text}
                </div>

                {index < chunks.length - 1 && (
                  <div style={{
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #667eea, transparent)',
                    margin: '1.5rem 0',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: '#0d0d0d',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.75rem',
                      color: '#667eea'
                    }}>
                      CHUNK BREAK
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="button secondary" onClick={onBack}>
              ← Back
            </button>
            <button className="button" onClick={handleNext}>
              Process Chunks →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STEP 4: PROCESSING & EXPORT
// ============================================================================

const Step4Processing = ({
  chunks,
  taskPrompt,
  processingMode,
  setProcessingMode,
  results,
  setResults,
  processingStatus,
  setProcessingStatus,
  onBack,
  showToast
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState(0);

  // Simulate AI processing (in real app, this would call an API)
  const processChunk = async (chunk) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Simulate processing based on task type
    let output = chunk.text;

    if (taskPrompt.toLowerCase().includes('flashcard')) {
      // Simple flashcard generation
      const sentences = chunk.text.split(/[.!?]+/).filter(s => s.trim());
      output = sentences.slice(0, 3).map((s, i) => {
        const q = `What is discussed in sentence ${i + 1}?`;
        const a = s.trim();
        return `${q};${a}`;
      }).join('\n');
    } else if (taskPrompt.toLowerCase().includes('summarize')) {
      // Simple summarization
      const words = chunk.text.split(/\s+/);
      output = `Summary: ${words.slice(0, Math.min(50, words.length)).join(' ')}...`;
    } else if (taskPrompt.toLowerCase().includes('bullet')) {
      // Convert to bullets
      const sentences = chunk.text.split(/[.!?]+/).filter(s => s.trim());
      output = sentences.map(s => `• ${s.trim()}`).join('\n');
    } else {
      // Generic processing
      output = `[Processed with: ${taskPrompt}]\n\n${chunk.text}`;
    }

    return output;
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    setCurrentProcessing(0);

    // Initialize results
    const initialResults = chunks.map(chunk => ({
      chunkId: chunk.id,
      status: 'pending',
      output: null
    }));
    setResults(initialResults);

    if (processingMode === 'sequential') {
      // Process sequentially
      for (let i = 0; i < chunks.length; i++) {
        setCurrentProcessing(i + 1);
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'processing' } : r
        ));

        try {
          const output = await processChunk(chunks[i]);
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: 'complete', output } : r
          ));
        } catch (error) {
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: 'error' } : r
          ));
          showToast(`Error processing chunk ${i + 1}`);
        }
      }
    } else {
      // Process in parallel
      const promises = chunks.map(async (chunk, i) => {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'processing' } : r
        ));

        try {
          const output = await processChunk(chunk);
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: 'complete', output } : r
          ));
        } catch (error) {
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: 'error' } : r
          ));
        }
      });

      await Promise.all(promises);
    }

    setIsProcessing(false);
    showToast('Processing complete!');
  };

  useEffect(() => {
    if (results.length === 0) {
      startProcessing();
    }
  }, []);

  const copyAll = () => {
    const allText = results
      .filter(r => r.status === 'complete')
      .map(r => r.output)
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(allText);
    showToast('All results copied to clipboard!');
  };

  const copyChunk = (output) => {
    navigator.clipboard.writeText(output);
    showToast('Copied to clipboard!');
  };

  const completedCount = results.filter(r => r.status === 'complete').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="step-content">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Processing Results</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem', color: '#a0a0a0' }}>Mode:</label>
              <select
                value={processingMode}
                onChange={(e) => setProcessingMode(e.target.value)}
                disabled={isProcessing}
                style={{
                  padding: '0.5rem',
                  background: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '6px',
                  color: '#e0e0e0'
                }}
              >
                <option value="sequential">Sequential</option>
                <option value="parallel">Parallel</option>
              </select>
            </div>
            {!isProcessing && completedCount > 0 && (
              <button className="button small" onClick={copyAll}>
                📋 Copy All
              </button>
            )}
          </div>
        </div>

        {isProcessing && (
          <div style={{
            padding: '1.5rem',
            background: '#1a1a1a',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
            <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              Processing {processingMode === 'sequential' ? `chunk ${currentProcessing}/${chunks.length}` : 'chunks in parallel'}...
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#2a2a2a',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '1rem'
            }}>
              <div style={{
                width: `${(completedCount / chunks.length) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {!isProcessing && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
            <span style={{ color: '#27ae60' }}>✓ {completedCount} completed</span>
            {errorCount > 0 && <span style={{ color: '#e74c3c' }}>✗ {errorCount} errors</span>}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {chunks.map((chunk, index) => {
            const result = results[index];
            if (!result) return null;

            return (
              <div key={chunk.id} style={{
                padding: '1.5rem',
                background: '#1a1a1a',
                borderRadius: '8px',
                border: `2px solid ${
                  result.status === 'complete' ? '#27ae60' :
                  result.status === 'error' ? '#e74c3c' :
                  result.status === 'processing' ? '#667eea' :
                  '#2a2a2a'
                }`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{chunk.title}</h3>
                    <div style={{ fontSize: '0.75rem', color: '#a0a0a0' }}>
                      {result.status === 'pending' && '⏳ Pending...'}
                      {result.status === 'processing' && '⚙️ Processing...'}
                      {result.status === 'complete' && '✓ Complete'}
                      {result.status === 'error' && '✗ Error'}
                    </div>
                  </div>
                  {result.status === 'complete' && (
                    <button
                      className="button small secondary"
                      onClick={() => copyChunk(result.output)}
                    >
                      📋 Copy
                    </button>
                  )}
                </div>

                {result.status === 'complete' && (
                  <div style={{
                    padding: '1rem',
                    background: '#0d0d0d',
                    borderRadius: '6px',
                    fontFamily: 'Monaco, monospace',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {result.output}
                  </div>
                )}

                {result.status === 'processing' && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#667eea' }}>
                    <div className="spinner" style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid #2a2a2a',
                      borderTop: '4px solid #667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto'
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button className="button secondary" onClick={onBack} disabled={isProcessing}>
            ← Back
          </button>
          {!isProcessing && (
            <button className="button" onClick={() => window.location.reload()}>
              🔄 Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App = () => {
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Step 1: Task Definition
  const [taskPrompt, setTaskPrompt] = useState('');
  const [savedTemplates, setSavedTemplates] = useState([]);

  // Step 2: Text Input
  const [rawText, setRawText] = useState('');

  // Step 3: Chunking
  const [chunks, setChunks] = useState([]);
  const [isChunking, setIsChunking] = useState(false);

  // Step 4: Processing
  const [processingMode, setProcessingMode] = useState('sequential');
  const [results, setResults] = useState([]);
  const [processingStatus, setProcessingStatus] = useState({});

  // Toast notification helper
  const showToast = (message) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Step navigation
  const goToStep = (step) => {
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step);
    }
  };

  const completeStep = (step) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps(prev => [...prev, step]);
    }
  };

  const nextStep = () => {
    completeStep(currentStep);
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Cmd/Ctrl + Enter to proceed to next step
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (currentStep < 4) {
          nextStep();
        }
      }
      // Cmd/Ctrl + Backspace to go back
      if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
        e.preventDefault();
        if (currentStep > 1) {
          prevStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStep]);

  // Load saved templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bulk-query-templates');
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
  }, []);

  // Save templates to localStorage
  useEffect(() => {
    if (savedTemplates.length > 0) {
      localStorage.setItem('bulk-query-templates', JSON.stringify(savedTemplates));
    }
  }, [savedTemplates]);

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          bulk-query
        </h1>
        <div style={{ fontSize: '0.75rem', color: '#666', textAlign: 'right' }}>
          <div>⌘/Ctrl + Enter: Next Step</div>
          <div>⌘/Ctrl + Backspace: Previous Step</div>
        </div>
      </div>

      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {currentStep === 1 && (
        <Step1TaskDefinition
          taskPrompt={taskPrompt}
          setTaskPrompt={setTaskPrompt}
          savedTemplates={savedTemplates}
          setSavedTemplates={setSavedTemplates}
          onNext={nextStep}
          showToast={showToast}
        />
      )}

      {currentStep === 2 && (
        <Step2TextInput
          rawText={rawText}
          setRawText={setRawText}
          onNext={nextStep}
          onBack={prevStep}
          showToast={showToast}
        />
      )}

      {currentStep === 3 && (
        <Step3Chunking
          rawText={rawText}
          taskPrompt={taskPrompt}
          chunks={chunks}
          setChunks={setChunks}
          isChunking={isChunking}
          setIsChunking={setIsChunking}
          onNext={nextStep}
          onBack={prevStep}
          showToast={showToast}
        />
      )}

      {currentStep === 4 && (
        <Step4Processing
          chunks={chunks}
          taskPrompt={taskPrompt}
          processingMode={processingMode}
          setProcessingMode={setProcessingMode}
          results={results}
          setResults={setResults}
          processingStatus={processingStatus}
          setProcessingStatus={setProcessingStatus}
          onBack={prevStep}
          showToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
};

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));

