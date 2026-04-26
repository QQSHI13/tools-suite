// Diff Viewer App
// Uses diff.js for diff_match_patch

// DOM Elements
const originalInput = document.getElementById('original');
const modifiedInput = document.getElementById('modified');
const diffOutput = document.getElementById('diff-output');
const addedCountEl = document.getElementById('added-count');
const removedCountEl = document.getElementById('removed-count');
const unchangedCountEl = document.getElementById('unchanged-count');
const toast = document.getElementById('toast');

// State
let viewMode = 'split';
let diffData = null;
const dmp = new diff_match_patch();
let diffTimeoutId = null;
let isComputingDiff = false;

// Virtualization settings
const VIRTUALIZATION_THRESHOLD = 10000; // Lines threshold for virtualization
const VIRTUAL_PAGE_SIZE = 100; // Lines per virtual page
let virtualStartIndex = 0;

// Options
let options = {
    ignoreWhitespace: false
};

// Initialize
function init() {
    loadFromURL();
    setupEventListeners();
    debouncedComputeDiff();
}

function setupEventListeners() {
    originalInput.addEventListener('input', debouncedComputeDiff);
    modifiedInput.addEventListener('input', debouncedComputeDiff);

    document.getElementById('btn-split').addEventListener('click', () => setViewMode('split'));
    document.getElementById('btn-inline').addEventListener('click', () => setViewMode('inline'));
    document.getElementById('btn-swap').addEventListener('click', swapInputs);
    document.getElementById('btn-clear').addEventListener('click', clearInputs);
    document.getElementById('btn-copy').addEventListener('click', copyResult);
    document.getElementById('btn-export').addEventListener('click', exportAsPatch);

    // Options
    const ignoreWhitespaceToggle = document.getElementById('opt-ignore-whitespace');
    
    if (ignoreWhitespaceToggle) {
        ignoreWhitespaceToggle.addEventListener('change', (e) => {
            options.ignoreWhitespace = e.target.checked;
            computeDiff();
        });
    }
            options.ignoreWhitespace = e.target.checked;
            computeDiff();
        });
    }

    document.querySelectorAll('.btn-paste').forEach(btn => {
        btn.addEventListener('click', () => pasteFromClipboard(btn.dataset.target));
    });

    // Virtualization scroll handler
    diffOutput.addEventListener('scroll', handleScroll);
}

function loadFromURL() {
    try {
        const params = new URLSearchParams(window.location.search);
        const original = params.get('original');
        const modified = params.get('modified');
        if (original !== null) {
            originalInput.value = new TextDecoder().decode(Uint8Array.from(atob(original), c => c.charCodeAt(0)));
        }
        if (modified !== null) {
            modifiedInput.value = new TextDecoder().decode(Uint8Array.from(atob(modified), c => c.charCodeAt(0)));
        }
    } catch (e) {
        console.error('Failed to load from URL:', e);
    }
}

function uint8ArrayToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function updateURL() {
    try {
        const original = originalInput.value;
        const modified = modifiedInput.value;
        if (!original && !modified) {
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }
        const enc = new TextEncoder();
        const originalEncoded = uint8ArrayToBase64(enc.encode(original));
        const modifiedEncoded = uint8ArrayToBase64(enc.encode(modified));
        const params = new URLSearchParams();
        if (original) params.set('original', originalEncoded);
        if (modified) params.set('modified', modifiedEncoded);
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    } catch (e) {
        console.error('Failed to update URL:', e);
    }
}

function splitLines(text) {
    if (!text) return [];
    if (text === '') return [];
    
    // Split by newline but preserve trailing empty lines info
    // Use regex to handle all types of line endings
    const lines = text.split(/\r?\n/);
    
    // Preserve trailing empty line - don't pop it
    // A file ending with a newline should have an empty last line
    // This is meaningful for diff accuracy
    return lines;
}

const debouncedComputeDiff = Utils.debounce(computeDiff, 300);

function computeDiff() {
    // Cancel any pending diff computation
    if (diffTimeoutId) {
        clearTimeout(diffTimeoutId);
        diffTimeoutId = null;
    }

    const original = originalInput.value;
    const modified = modifiedInput.value;

    if (!original && !modified) {
        showPlaceholder();
        return;
    }

    // Set a timeout to prevent browser hang on large diffs
    const startTime = Date.now();
    const DIFF_TIMEOUT = 5000; // 5 seconds timeout

    isComputingDiff = true;
    showComputingIndicator();

    try {
        let originalText = original;
        let modifiedText = modified;

        // Apply ignore whitespace option
        if (options.ignoreWhitespace) {
            originalText = originalText.replace(/\s+/g, ' ').trim();
            modifiedText = modifiedText.replace(/\s+/g, ' ').trim();
        }

        // Check for timeout before starting
        if (Date.now() - startTime > DIFF_TIMEOUT) {
            showError('Diff computation timed out. Try with smaller files.');
            isComputingDiff = false;
            return;
        }

        const diffs = dmp.diff_main(originalText, modifiedText);
        
        // Check for timeout after diff computation
        if (Date.now() - startTime > DIFF_TIMEOUT) {
            showError('Diff computation timed out. Try with smaller files.');
            isComputingDiff = false;
            return;
        }

        dmp.diff_cleanupSemantic(diffs);

        diffData = diffs;
        virtualStartIndex = 0;
        renderDiff(diffs);
        updateStats(diffs);
        
        // Update URL after diff computation completes to avoid race conditions
        updateURL();
    } catch (error) {
        console.error('Diff computation error:', error);
        showError('Error computing diff: ' + error.message);
    } finally {
        isComputingDiff = false;
        hideComputingIndicator();
    }
}

function showComputingIndicator() {
    diffOutput.setAttribute('aria-busy', 'true');
}

function hideComputingIndicator() {
    diffOutput.setAttribute('aria-busy', 'false');
}

function showError(message) {
    diffOutput.innerHTML = `
        <div class="diff-error" role="alert">
            <span aria-hidden="true">⚠️</span> ${escapeHtml(message)}
        </div>
    `;
    updateStats([]);
}

function showPlaceholder() {
    diffOutput.innerHTML = `
        <div class="diff-placeholder">
            Enter text in both fields to see the diff
        </div>
    `;
    updateStats([]);
}

function renderDiff(diffs) {
    // Count total lines to decide on virtualization
    let totalLines = 0;
    diffs.forEach(([type, text]) => {
        if (text) {
            totalLines += splitLines(text).length;
        }
    });

    const useVirtualization = totalLines > VIRTUALIZATION_THRESHOLD;

    if (viewMode === 'split') {
        renderSplitView(diffs, useVirtualization);
    } else {
        renderInlineView(diffs, useVirtualization);
    }
}

function renderSplitView(diffs, useVirtualization = false) {
    const leftLines = [];
    const rightLines = [];
    let leftLineNum = 1;
    let rightLineNum = 1;

    diffs.forEach(([type, text]) => {
        if (!text) return;
        const lines = splitLines(text);

        lines.forEach(line => {
            if (type === 0) { // Equal
                // Create separate objects for left and right to avoid shared reference bug
                leftLines.push({
                    type: 'unchanged',
                    content: escapeHtml(line),
                    leftNum: leftLineNum++,
                    rightNum: null
                });
                rightLines.push({
                    type: 'unchanged',
                    content: escapeHtml(line),
                    leftNum: null,
                    rightNum: rightLineNum++
                });
            } else if (type === -1) { // Deleted
                leftLines.push({
                    type: 'removed',
                    content: escapeHtml(line),
                    leftNum: leftLineNum++,
                    rightNum: null
                });
            } else if (type === 1) { // Inserted
                rightLines.push({
                    type: 'added',
                    content: escapeHtml(line),
                    leftNum: null,
                    rightNum: rightLineNum++
                });
            }
        });
    });

    const maxLines = Math.max(leftLines.length, rightLines.length);

    // Apply virtualization if needed
    let startIdx = 0;
    let endIdx = maxLines;
    let virtualizationInfo = '';

    if (useVirtualization) {
        startIdx = virtualStartIndex;
        endIdx = Math.min(startIdx + VIRTUAL_PAGE_SIZE, maxLines);
        virtualizationInfo = `
            <div class="virtualization-info" role="status" aria-live="polite">
                Showing lines ${startIdx + 1} - ${endIdx} of ${maxLines} 
                <button onclick="scrollVirtualPage(-1)" ${startIdx === 0 ? 'disabled' : ''}>← Previous</button>
                <button onclick="scrollVirtualPage(1)" ${endIdx >= maxLines ? 'disabled' : ''}>Next →</button>
            </div>
        `;
    }

    let html = '<div class="diff-split">';
    
    // Left pane
    html += '<div class="diff-pane" role="region" aria-label="Original content">';
    html += '<div class="diff-pane-header">Original</div>';
    for (let i = startIdx; i < endIdx; i++) {
        const line = leftLines[i];
        if (line) {
            const marker = line.type === 'removed' ? '−' : '&nbsp;';
            html += `<div class="diff-line ${line.type}" role="listitem">
                <span class="line-number" aria-label="Line ${line.leftNum || ''}">${line.leftNum || ''}</span>
                <span class="line-marker" aria-hidden="true">${marker}</span>
                <span class="line-content">${line.content || '&nbsp;'}</span>
            </div>`;
        } else {
            html += `<div class="diff-line empty" role="listitem">
                <span class="line-number"></span>
                <span class="line-marker"></span>
                <span class="line-content"></span>
            </div>`;
        }
    }
    html += '</div>';

    // Right pane
    html += '<div class="diff-pane" role="region" aria-label="Modified content">';
    html += '<div class="diff-pane-header">Modified</div>';
    for (let i = startIdx; i < endIdx; i++) {
        const line = rightLines[i];
        if (line) {
            const marker = line.type === 'added' ? '+' : '&nbsp;';
            html += `<div class="diff-line ${line.type}" role="listitem">
                <span class="line-number" aria-label="Line ${line.rightNum || ''}">${line.rightNum || ''}</span>
                <span class="line-marker" aria-hidden="true">${marker}</span>
                <span class="line-content">${line.content || '&nbsp;'}</span>
            </div>`;
        } else {
            html += `<div class="diff-line empty" role="listitem">
                <span class="line-number"></span>
                <span class="line-marker"></span>
                <span class="line-content"></span>
            </div>`;
        }
    }
    html += '</div>';

    html += '</div>';
    
    if (useVirtualization) {
        html = virtualizationInfo + html;
    }
    
    diffOutput.innerHTML = html;
}

function renderInlineView(diffs, useVirtualization = false) {
    let html = '<div class="diff-inline" role="list">';
    let lineNum = 1;
    const allLines = [];

    diffs.forEach(([type, text]) => {
        if (!text) return;
        const lines = splitLines(text);

        lines.forEach(line => {
            let typeClass = 'unchanged';
            let marker = '&nbsp;';
            let currentLineNum = '';

            if (type === -1) {
                typeClass = 'removed';
                marker = '−';
            } else if (type === 1) {
                typeClass = 'added';
                marker = '+';
            } else {
                currentLineNum = lineNum;
                lineNum++;
            }

            allLines.push({
                typeClass,
                marker,
                lineNum: currentLineNum,
                content: escapeHtml(line)
            });
        });
    });

    // Apply virtualization
    let startIdx = 0;
    let endIdx = allLines.length;
    let virtualizationInfo = '';

    if (useVirtualization) {
        startIdx = virtualStartIndex;
        endIdx = Math.min(startIdx + VIRTUAL_PAGE_SIZE, allLines.length);
        virtualizationInfo = `
            <div class="virtualization-info" role="status" aria-live="polite">
                Showing lines ${startIdx + 1} - ${endIdx} of ${allLines.length}
                <button onclick="scrollVirtualPage(-1)" ${startIdx === 0 ? 'disabled' : ''}>← Previous</button>
                <button onclick="scrollVirtualPage(1)" ${endIdx >= allLines.length ? 'disabled' : ''}>Next →</button>
            </div>
        `;
    }

    for (let i = startIdx; i < endIdx; i++) {
        const line = allLines[i];
        html += `<div class="diff-line ${line.typeClass}" role="listitem">
            <span class="line-number" aria-label="Line ${line.lineNum || ''}">${line.lineNum || ''}</span>
            <span class="line-marker" aria-hidden="true">${line.marker}</span>
            <span class="line-content">${line.content || '&nbsp;'}</span>
        </div>`;
    }

    html += '</div>';
    
    if (useVirtualization) {
        html = virtualizationInfo + html;
    }
    
    diffOutput.innerHTML = html;
}

function scrollVirtualPage(direction) {
    virtualStartIndex += direction * VIRTUAL_PAGE_SIZE;
    if (virtualStartIndex < 0) virtualStartIndex = 0;
    if (diffData) {
        renderDiff(diffData);
    }
}

function handleScroll() {
    // Virtualization scroll handler - can be enhanced for dynamic loading
}

function updateStats(diffs) {
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diffs.forEach(([type, text]) => {
        if (!text) return;
        const lines = splitLines(text);
        const count = lines.length;
        
        if (type === 1) added += count;
        else if (type === -1) removed += count;
        else unchanged += count;
    });

    addedCountEl.textContent = `+${added} added`;
    addedCountEl.setAttribute('aria-label', `${added} lines added`);
    removedCountEl.textContent = `−${removed} removed`;
    removedCountEl.setAttribute('aria-label', `${removed} lines removed`);
    unchangedCountEl.textContent = `${unchanged} unchanged`;
    unchangedCountEl.setAttribute('aria-label', `${unchanged} lines unchanged`);
}

function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('btn-split').classList.toggle('active', mode === 'split');
    document.getElementById('btn-inline').classList.toggle('active', mode === 'inline');
    document.getElementById('btn-split').setAttribute('aria-pressed', mode === 'split');
    document.getElementById('btn-inline').setAttribute('aria-pressed', mode === 'inline');
    if (diffData) {
        renderDiff(diffData);
    }
}

function swapInputs() {
    const temp = originalInput.value;
    originalInput.value = modifiedInput.value;
    modifiedInput.value = temp;
    computeDiff();
}

function clearInputs() {
    if (originalInput.value || modifiedInput.value) {
        if (!confirm('Are you sure you want to clear all content? This action cannot be undone.')) {
            return;
        }
    }
    originalInput.value = '';
    modifiedInput.value = '';
    showPlaceholder();
    updateURL();
}

async function pasteFromClipboard(target) {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById(target).value = text;
        computeDiff();
        showToast(`Pasted into ${target}`);
    } catch (err) {
        showToast('Failed to paste from clipboard');
    }
}

function copyResult() {
    const original = originalInput.value;
    const modified = modifiedInput.value;
    
    if (!original && !modified) {
        showToast('Nothing to copy');
        return;
    }
    
    const text = generatePlainTextDiff();
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard');
    }).catch(() => {
        showToast('Failed to copy');
    });
}

function exportAsPatch() {
    const original = originalInput.value;
    const modified = modifiedInput.value;
    
    if (!original && !modified) {
        showToast('Nothing to export');
        return;
    }

    const patch = generatePatch();
    const blob = new Blob([patch], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff.patch';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Patch exported');
}

function generatePatch() {
    if (!diffData) return '';
    
    const date = new Date().toISOString();
    let patch = `--- original\t${date}\n`;
    patch += `+++ modified\t${date}\n`;
    patch += `@@ -1,${(originalInput.value.match(/\n/g) || []).length + 1} +1,${(modifiedInput.value.match(/\n/g) || []).length + 1} @@\n`;
    
    patch += generatePlainTextDiff();
    return patch;
}

function generatePlainTextDiff() {
    if (!diffData) return '';
    
    return diffData.map(([type, text]) => {
        const lines = splitLines(text);
        
        return lines.map(line => {
            if (type === -1) return `- ${line}`;
            if (type === 1) return `+ ${line}`;
            return `  ${line}`;
        }).join('\n');
    }).join('\n');
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Make scrollVirtualPage globally accessible
window.scrollVirtualPage = scrollVirtualPage;

// Start
init();
