# Technical Documentation - ResumeAI

## Architecture Overview

ResumeAI is a client-side web application built with vanilla JavaScript that provides comprehensive resume analysis without requiring any backend infrastructure.

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│                     (index.html)                         │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                Application Controller                    │
│                    (main.js)                            │
│  • File Upload Management                               │
│  • UI State Management                                  │
│  • Progress Tracking                                    │
│  • Tab Navigation                                       │
└───────┬───────────┬───────────┬─────────────────────────┘
        │           │           │
        ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐
│ Parser   │ │ Analyzer │ │  Rewriter    │
│ Module   │ │ Module   │ │  Module      │
│          │ │          │ │              │
│ PDF.js   │ │ Scoring  │ │ Content Gen  │
│ Mammoth  │ │ Analysis │ │ Suggestions  │
│ Text     │ │ Metrics  │ │ Display      │
└──────────┘ └──────────┘ └──────────────┘
```

---

## Module Breakdown

### 1. main.js - Application Controller

**Purpose**: Orchestrates the entire application flow and manages UI interactions.

**Key Functions**:
- `handleFileSelect(file)` - Validates and displays selected file
- `analyzeResume()` - Main analysis pipeline
- `displayResults()` - Renders all analysis results
- `updateLoadingProgress(percent, text)` - Updates loading UI

**State Management**:
```javascript
let currentFile = null;           // Currently selected file
let currentResumeData = null;     // Parsed resume data
let analysisResults = null;       // Analysis results object
```

**Event Handlers**:
- File upload (drag & drop, click)
- Tab navigation
- Analyze button
- Export/download actions

---

### 2. parser.js - Document Parser

**Purpose**: Extracts text content from various file formats.

#### Main Function
```javascript
async function parseResumeFile(file) -> Promise<string>
```

#### Supported Formats

**PDF Parsing** (via PDF.js)
```javascript
async function parsePDF(file)
- Uses Mozilla's PDF.js library
- Extracts text from all pages
- Handles multi-page documents
- Returns concatenated text content
```

**DOCX Parsing** (via Mammoth.js)
```javascript
async function parseDOCX(file)
- Converts DOCX to plain text
- Preserves basic formatting
- Handles complex documents
- Returns raw text content
```

**TXT Parsing** (Native)
```javascript
async function parseTXT(file)
- Direct file reading
- UTF-8 encoding support
- Simple and fast
```

#### Data Extraction
```javascript
function extractResumeData(text) -> Object
```

Returns structured data:
```javascript
{
    rawText: string,           // Full text content
    contact: {
        email: string|null,
        phone: string|null,
        linkedin: string|null,
        website: string|null
    },
    summary: string|null,       // Professional summary
    experience: {
        text: string,
        numberOfJobs: number,
        hasBulletPoints: boolean,
        hasMetrics: boolean
    }|null,
    education: {
        text: string,
        hasDegree: boolean,
        hasGPA: boolean,
        hasGraduationDate: boolean
    }|null,
    skills: {
        text: string,
        skills: string[],
        count: number,
        isOrganized: boolean
    }|null,
    keywords: {
        keywords: string[],
        count: number,
        hasTechnical: boolean,
        hasProfessional: boolean
    },
    length: number,             // Character count
    wordCount: number           // Word count
}
```

#### Pattern Matching
Uses regular expressions to identify:
- Contact information (email, phone, LinkedIn)
- Section headers (Experience, Education, Skills)
- Dates and timeframes
- Bullet points and formatting
- Keywords and action verbs

---

### 3. analyzer.js - Resume Analyzer

**Purpose**: Evaluates resume quality and generates comprehensive scores.

#### Main Function
```javascript
function analyzeResumeQuality(resumeData) -> Object
```

#### Scoring Algorithm

**Content Quality (0-100)**
```javascript
function analyzeContent(data)
- Summary/Objective: 20 points
- Word count (300-800): 25 points
- Quantifiable achievements: 25 points
- Action verbs: 15 points
- Content relevance: 15 points
```

**Formatting (0-100)**
```javascript
function analyzeFormatting(data)
- Contact information: 25 points
- Clear sections: 30 points
- Bullet points: 20 points
- Appropriate length: 15 points
- Organization: 10 points
```

**Keywords & ATS (0-100)**
```javascript
function analyzeKeywords(data)
- Keyword count: 40 points
- Technical keywords: 30 points
- Professional keywords: 30 points
```

**Work Experience (0-100)**
```javascript
function analyzeExperience(data)
- Section present: 20 points
- Multiple jobs: 25 points
- Bullet points: 25 points
- Quantifiable metrics: 30 points
```

**Skills (0-100)**
```javascript
function analyzeSkills(data)
- Section present: 20 points
- Number of skills: 40 points
- Organization: 20 points
- Relevance: 20 points
```

**Education (0-100)**
```javascript
function analyzeEducation(data)
- Section present: 30 points
- Degree information: 35 points
- Graduation date: 20 points
- GPA (optional): 15 points
```

#### Overall Score Calculation
```javascript
Weighted Average:
- Content: 25%
- Formatting: 15%
- Keywords: 20%
- Experience: 20%
- Skills: 10%
- Education: 10%

overallScore = Σ(category_score × weight)
```

#### Suggestion Generation
```javascript
function generateSuggestions(analysis, data) -> Array<Suggestion>
```

Suggestion Object Structure:
```javascript
{
    priority: 'high'|'medium'|'low',
    category: string,
    icon: string,              // Font Awesome icon class
    iconColor: string,         // Hex color
    title: string,
    description: string,
    tips: string[]            // Array of actionable tips
}
```

---

### 4. rewriter.js - Content Rewriter

**Purpose**: Generates improved resume content and displays results.

#### Content Generation
```javascript
function generateImprovedContent(data, analysis) -> Object
```

Returns:
```javascript
{
    summary: {
        original: string,
        improved: string,
        changes: string[]
    },
    experience: {...},
    skills: {...},
    education: {...},
    fullResume: string        // Complete improved resume
}
```

#### Improvement Strategies

**Summary Enhancement**
- Replace personal pronouns with professional tone
- Add power phrases and action-oriented language
- Highlight key achievements
- Emphasize results and expertise

**Experience Enhancement**
- Start with strong action verbs
- Add quantifiable metrics
- Use STAR method structure
- Highlight leadership and impact

**Skills Enhancement**
- Organize by category
- Include both technical and soft skills
- Add specific versions/tools
- Use ATS-friendly terminology

**Education Enhancement**
- Complete degree information
- Add relevant coursework
- Include honors and activities
- Format consistently

#### Display Functions

**Charts & Visualizations**
```javascript
drawScoreGauge(score)           // Doughnut chart
drawCategoryChart(breakdown)    // Bar chart
drawComparisonChart(results)    // Radar chart
```

Uses Chart.js library:
- Responsive design
- Smooth animations
- Color-coded categories
- Interactive tooltips

---

## Data Flow

### Upload & Analysis Pipeline

```
1. File Selection
   ├── Validate file type
   ├── Validate file size
   └── Display file info

2. Parsing Phase
   ├── Read file content
   ├── Extract text (PDF/DOCX/TXT)
   └── Structure data

3. Analysis Phase
   ├── Extract resume sections
   ├── Calculate scores (6 categories)
   ├── Identify strengths
   ├── Identify weaknesses
   └── Generate suggestions

4. Content Generation
   ├── Improve summary
   ├── Enhance experience
   ├── Organize skills
   └── Format education

5. Display Phase
   ├── Render score gauge
   ├── Show category breakdown
   ├── Display suggestions
   ├── Show rewritten content
   ├── Create comparison view
   └── Generate charts
```

---

## Performance Considerations

### Optimization Techniques

**File Parsing**
- Async operations prevent UI blocking
- Progress indicators for user feedback
- Error handling for corrupted files

**Memory Management**
- Limited to 10MB file size
- Garbage collection friendly
- No persistent storage

**Rendering**
- Virtual DOM not needed (vanilla JS)
- Direct DOM manipulation
- Efficient event delegation
- CSS transitions for smooth animations

**Chart Performance**
- Destroy old chart instances before creating new
- Fixed canvas sizes to prevent reflow
- Optimized data structures

---

## Browser Compatibility

### Required APIs
- FileReader API
- Canvas API (for charts)
- ES6+ JavaScript features
- Fetch API
- Promises/Async-Await

### Polyfills (if needed for older browsers)
```javascript
// Not included by default
// Add if targeting IE11 or older browsers:
- Promise polyfill
- Fetch polyfill
- ES6 features (Babel transpilation)
```

---

## Security Considerations

### Client-Side Processing
✅ **Secure**: All processing happens in browser
✅ **Private**: No data sent to servers
✅ **Local**: Files never leave user's device

### File Validation
- Type checking (MIME type + extension)
- Size limits (10MB max)
- Content sanitization
- XSS prevention in display

### No Storage
- No cookies
- No localStorage
- No sessionStorage
- No IndexedDB

---

## Error Handling

### Common Errors

**File Upload Errors**
```javascript
- Invalid file type
- File too large
- File read error
- Corrupted file
```

**Parsing Errors**
```javascript
try {
    const text = await parseResumeFile(file);
} catch (error) {
    console.error('Parsing error:', error);
    alert('Error analyzing resume: ' + error.message);
    // Restore UI state
}
```

**Display Errors**
- Chart rendering failures
- DOM manipulation errors
- Graceful degradation

---

## Testing Strategy

### Manual Testing Checklist

**File Upload**
- [ ] PDF upload and parsing
- [ ] DOCX upload and parsing
- [ ] TXT upload and parsing
- [ ] Invalid file rejection
- [ ] Large file rejection
- [ ] Drag & drop functionality

**Analysis**
- [ ] Score calculation accuracy
- [ ] Suggestion generation
- [ ] Content rewriting
- [ ] Chart rendering

**UI/UX**
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Tab navigation
- [ ] Loading states
- [ ] Error messages
- [ ] Copy to clipboard
- [ ] Download functionality

**Browser Testing**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Extension Points

### Adding New Features

**New Scoring Category**
```javascript
// In analyzer.js
function analyzeNewCategory(data) {
    let score = 0;
    // Scoring logic
    return Math.min(100, score);
}

// Update analyzeResumeQuality
breakdown.newCategory = analyzeNewCategory(resumeData);

// Update weights
const weights = {
    // ... existing weights
    newCategory: 0.05
};
```

**New File Format**
```javascript
// In parser.js
async function parseNewFormat(file) {
    // Parsing logic
    return extractedText;
}

// Update parseResumeFile
if (fileExtension === '.new') {
    return await parseNewFormat(file);
}
```

**New Suggestion Type**
```javascript
// In analyzer.js
if (customCondition) {
    suggestions.push({
        priority: 'medium',
        category: 'New Category',
        icon: 'fa-icon-name',
        iconColor: '#color',
        title: 'Suggestion Title',
        description: 'Description...',
        tips: ['Tip 1', 'Tip 2']
    });
}
```

---

## Dependencies

### External Libraries

**Chart.js v4.x**
- Purpose: Data visualization
- CDN: jsdelivr
- Size: ~200KB
- License: MIT

**PDF.js v3.11.174**
- Purpose: PDF parsing
- CDN: jsdelivr
- Size: ~1.5MB (with worker)
- License: Apache 2.0

**Mammoth.js v1.6.0**
- Purpose: DOCX parsing
- CDN: jsdelivr
- Size: ~300KB
- License: BSD-2-Clause

**Font Awesome v6.4.0**
- Purpose: Icons
- CDN: jsdelivr
- Size: ~80KB
- License: Free (Font Awesome Free)

**Google Fonts - Inter**
- Purpose: Typography
- CDN: Google Fonts
- Size: Variable
- License: OFL

---

## Deployment

### Static Hosting
Can be deployed to any static hosting platform:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Azure Static Web Apps
- Firebase Hosting

### Build Process
No build process required - works directly with source files.

Optional optimization:
- Minify JavaScript files
- Minify CSS
- Combine files
- Enable GZIP compression

---

## Future API Integration

### Placeholder for AI API

```javascript
// Example: OpenAI GPT-4 integration
async function generateWithAI(prompt, resumeText) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [{
                role: 'system',
                content: 'You are a professional resume writer.'
            }, {
                role: 'user',
                content: `${prompt}\n\nResume content:\n${resumeText}`
            }]
        })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
}
```

---

## Code Style Guide

### Naming Conventions
- Functions: camelCase (`analyzeResume`, `parseResumeFile`)
- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `API_KEY`)
- Classes: PascalCase (not used in current implementation)
- Variables: camelCase (`currentFile`, `analysisResults`)

### Comments
- Function documentation with JSDoc style
- Inline comments for complex logic
- Section headers with separator lines

### Code Organization
- Related functions grouped together
- Clear separation of concerns
- Modular architecture
- Exports at end of files

---

## Troubleshooting Guide

### Common Issues

**PDF not parsing correctly**
- Issue: Complex PDF formatting
- Solution: Use text-based PDFs, not scanned images
- Alternative: Convert to DOCX or TXT

**Charts not rendering**
- Issue: Canvas API not supported
- Solution: Update browser or use fallback display

**Slow performance**
- Issue: Large file processing
- Solution: Optimize file size, reduce complexity

**Memory issues**
- Issue: Multiple large files analyzed in session
- Solution: Refresh page between analyses

---

## Performance Metrics

### Target Performance
- File upload: < 100ms
- PDF parsing: < 2s for 2-page resume
- DOCX parsing: < 1s
- Analysis: < 500ms
- UI rendering: < 200ms
- Total time: < 5s for typical resume

### Actual Performance (typical)
- 2-page PDF: 3-4 seconds total
- 1-page DOCX: 2-3 seconds total
- TXT file: 1-2 seconds total

---

## Contributing Guidelines

### Code Contributions
1. Follow existing code style
2. Add comments for complex logic
3. Test across browsers
4. Update documentation
5. No dependencies without discussion

### Bug Reports
Include:
- Browser and version
- File format tested
- Error messages
- Steps to reproduce

---

**Last Updated**: 2024
**Version**: 1.0.0
**Maintainer**: Development Team
