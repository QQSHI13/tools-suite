/**
 * Tools Suite - Shared Utilities
 * Common utility functions used across all tools to reduce code duplication
 */

(function(global) {
    'use strict';

    /**
     * Comprehensive HTML escaping to prevent XSS attacks
     * Escapes & < > " ' to prevent both content injection and attribute injection
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML string
     */
    function escapeHtml(text) {
        if (text == null) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Debounce function to limit execution frequency
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function with cancel method
     */
    function debounce(func, wait) {
        let timeout;
        const debounced = function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
        
        // Add cancel method to clear pending execution
        debounced.cancel = function() {
            clearTimeout(timeout);
        };
        
        return debounced;
    }

    /**
     * Throttle function to limit execution to once per limit period
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Format bytes to human-readable string
     * @param {number} bytes - Number of bytes
     * @param {number} [decimals=2] - Number of decimal places
     * @returns {string} Formatted string (e.g., "1.5 MB")
     */
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 B';
        if (!bytes || bytes < 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        const dm = decimals < 0 ? 0 : decimals;
        const sizeIndex = Math.min(i, sizes.length - 1);
        
        return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(dm)) + ' ' + sizes[sizeIndex];
    }

    /**
     * Copy text to clipboard with fallback for older browsers
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    async function copyToClipboard(text) {
        // Try modern Clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.warn('Clipboard API failed, using fallback:', err);
            }
        }
        
        // Fallback: Create temporary textarea and use execCommand
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        textarea.setAttribute('readonly', '');
        
        document.body.appendChild(textarea);
        
        try {
            textarea.select();
            textarea.setSelectionRange(0, 99999); // For mobile
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch (err) {
            document.body.removeChild(textarea);
            console.error('Fallback copy failed:', err);
            return false;
        }
    }

    /**
     * Sanitize user input to prevent injection attacks
     * @param {string} input - Raw input string
     * @returns {string} Sanitized string
     */
    function sanitizeInput(input) {
        if (input == null) return '';
        
        return String(input)
            // Remove null bytes
            .replace(/\0/g, '')
            // Remove control characters except common whitespace
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            // Trim whitespace
            .trim();
    }

    /**
     * Format size alias for compatibility (same as formatBytes)
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted string
     */
    function formatSize(bytes) {
        return formatBytes(bytes);
    }

    // Expose utilities to global scope
    const Utils = {
        escapeHtml,
        debounce,
        throttle,
        formatBytes,
        formatSize,
        copyToClipboard,
        sanitizeInput
    };

    // Support both CommonJS and browser environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Utils;
    } else {
        global.Utils = Utils;
        // Also expose individual functions for convenience
        global.escapeHtml = escapeHtml;
        global.debounce = debounce;
        global.throttle = throttle;
        global.formatBytes = formatBytes;
        global.formatSize = formatSize;
        global.copyToClipboard = copyToClipboard;
        global.sanitizeInput = sanitizeInput;
    }

})(typeof window !== 'undefined' ? window : global);
