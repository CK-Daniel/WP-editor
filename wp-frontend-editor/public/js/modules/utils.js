/**
 * WP Frontend Editor Utilities Module
 * Helper functions for the editor
 */

var WPFE = WPFE || {};

WPFE.utils = (function($) {
    'use strict';

    return {
        /**
         * Throttle function to limit the rate at which a function can fire.
         * 
         * @param {Function} func The function to throttle
         * @param {number} wait The delay in milliseconds
         * @return {Function} The throttled function
         */
        throttle: function(func, wait) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                if (!timeout) {
                    timeout = setTimeout(function() {
                        timeout = null;
                        func.apply(context, args);
                    }, wait);
                }
            };
        },
        
        /**
         * Debounce function to group multiple sequential calls into a single execution.
         * 
         * @param {Function} func The function to debounce
         * @param {number} wait The delay in milliseconds
         * @param {boolean} immediate Trigger the function immediately
         * @return {Function} The debounced function
         */
        debounce: function(func, wait, immediate) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        },
        
        /**
         * Calculate similarity between two text strings
         * Returns a score from 0 (no similarity) to 1 (identical)
         * 
         * @param {string} str1 First string
         * @param {string} str2 Second string
         * @return {number} Similarity score (0-1)
         */
        calculateContentSimilarity: function(str1, str2) {
            // If either string is empty, no similarity
            if (!str1 || !str2) {
                return 0;
            }
            
            // Normalize strings - lowercase and trim
            str1 = (str1 + '').toLowerCase().trim();
            str2 = (str2 + '').toLowerCase().trim();
            
            // If strings are identical, perfect match
            if (str1 === str2) {
                return 1;
            }
            
            // If one string contains the other completely
            if (str1.indexOf(str2) !== -1) {
                return str2.length / str1.length;
            }
            if (str2.indexOf(str1) !== -1) {
                return str1.length / str2.length;
            }
            
            // If one string is much longer than the other, use different strategy
            if (str1.length > 3 * str2.length || str2.length > 3 * str1.length) {
                // Look for common substring matches
                var commonSubstring = this.findLongestCommonSubstring(str1, str2);
                if (commonSubstring.length > 0) {
                    return commonSubstring.length / Math.max(str1.length, str2.length);
                }
            }
            
            // Calculate general similarity based on character matching
            var commonChars = 0;
            for (var i = 0; i < str1.length; i++) {
                if (str2.indexOf(str1[i]) !== -1) {
                    commonChars++;
                }
            }
            
            return commonChars / Math.max(str1.length, str2.length);
        },
        
        /**
         * Find the longest common substring between two strings
         * 
         * @param {string} str1 First string
         * @param {string} str2 Second string
         * @return {string} Longest common substring
         */
        findLongestCommonSubstring: function(str1, str2) {
            if (!str1 || !str2) {
                return '';
            }
            
            var m = str1.length;
            var n = str2.length;
            var max = 0;
            var end = 0;
            
            // Simple implementation for frontend
            for (var i = 0; i < m; i++) {
                for (var j = 0; j < n; j++) {
                    var length = 0;
                    while (i + length < m && j + length < n && 
                           str1[i + length] === str2[j + length]) {
                        length++;
                    }
                    if (length > max) {
                        max = length;
                        end = i + max - 1;
                    }
                }
            }
            
            return max > 0 ? str1.substring(end - max + 1, end + 1) : '';
        },
        
        /**
         * Get a template with values replaced
         * 
         * @param {string} templateName The name of the template
         * @param {Object} data The data to replace variables in the template
         * @return {string} The processed template
         */
        getTemplate: function(templateName, data) {
            var template = WPFE.core.templates[templateName];
            
            if (!template) {
                return '';
            }
            
            // Replace variables in the template
            if (data) {
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        template = template.replace(new RegExp('{{' + key + '}}', 'g'), data[key]);
                    }
                }
            }
            
            return template;
        },
        
        /**
         * Format a string with dynamic replacements
         * Similar to sprintf in PHP
         * 
         * @param {string} format The string with placeholders
         * @param {...*} args The values to insert
         * @return {string} Formatted string
         */
        formatString: function(format) {
            var args = Array.prototype.slice.call(arguments, 1);
            return format.replace(/{(\d+)}/g, function(match, number) { 
                return typeof args[number] !== 'undefined' ? args[number] : match;
            });
        },
        
        /**
         * Sanitize a string for display
         * 
         * @param {string} str The string to sanitize
         * @return {string} Sanitized string
         */
        sanitizeString: function(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },
        
        /**
         * Convert HTML entities to characters
         * 
         * @param {string} str The string with HTML entities
         * @return {string} String with entities decoded
         */
        decodeHTML: function(str) {
            if (!str) return '';
            var textarea = document.createElement('textarea');
            textarea.innerHTML = str;
            return textarea.value;
        },
        
        /**
         * Strip HTML tags from a string
         * 
         * @param {string} html The HTML string
         * @return {string} Plain text without HTML
         */
        stripTags: function(html) {
            if (!html) return '';
            return html.replace(/<\/?[^>]+(>|$)/g, '');
        }
    };
})(jQuery);