/**
 * ResumeAI Pro — Parser Module
 * Client-side document text extraction (PDF, DOCX, TXT).
 * Called by main.js parseFile() function.
 */

// This module provides the parseResumeFile function for legacy compatibility.
// The main parsing logic is now inline in main.js parseFile().

async function parseResumeFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'txt') {
        return await file.text();
    }

    if (ext === 'pdf' && typeof pdfjsLib !== 'undefined') {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
        }
        return text;
    }

    if ((ext === 'docx' || ext === 'doc') && typeof mammoth !== 'undefined') {
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        return result.value;
    }

    // Fallback
    return await file.text();
}
