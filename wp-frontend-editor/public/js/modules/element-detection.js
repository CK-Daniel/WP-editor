/**
 * WP Frontend Editor - Element Detection Module
 * Handles finding editable elements in the DOM
 */

(function($, WPFE) {
    'use strict';

    // Initialize the detection functionality in the elements namespace
    WPFE.elements = WPFE.elements || {};
    
    /**
     * Run progressive discovery of editable elements
     * Implements multiple detection strategies with fallbacks
     */
    WPFE.elements.runProgressiveDiscovery = function() {
        WPFE.debug.log('Starting progressive element discovery');
        
        // Reset element tracking
        WPFE.elements.resetElements();
        
        // Step 1: Find already marked elements
        var markedCount = WPFE.elements.findMarkedElements();
        WPFE.debug.log('Found ' + markedCount + ' marked elements');
        
        // Step 2: If we found too few elements, look for WordPress core content
        if (markedCount < 2) {
            var coreCount = WPFE.elements.findCoreElements();
            WPFE.debug.log('Found ' + coreCount + ' core elements');
        }
        
        // Step 3: If ACF is active, look for ACF fields
        if (wpfe_data.is_acf_active) {
            var acfCount = WPFE.elements.findAcfFields();
            WPFE.debug.log('Found ' + acfCount + ' ACF fields');
        }
        
        // Step 4: If we still have too few elements, try content matching
        if (WPFE.elements.getElementCount() < 3) {
            var contentMatchCount = WPFE.elements.findElementsByContent();
            WPFE.debug.log('Found ' + contentMatchCount + ' elements by content matching');
        }
        
        // Final element count
        var finalCount = WPFE.elements.getElementCount();
        WPFE.debug.log('Total elements discovered: ' + finalCount);
        
        // Log error if we found no elements
        if (finalCount === 0) {
            console.error('[WPFE] Error: Found 0 editable elements during discovery');
        }
        
        return finalCount;
    };
    
    /**
     * Find elements that are already marked with wpfe classes or data attributes
     * 
     * @return {number} Number of elements found
     */
    WPFE.elements.findMarkedElements = function() {
        var count = 0;
        
        // Look for elements with wpfe-editable class
        $('.wpfe-editable').each(function() {
            var $element = $(this);
            var fieldName = $element.attr('data-wpfe-field');
            var postId = $element.attr('data-wpfe-post-id');
            
            if (fieldName) {
                WPFE.elements.storeElement($element, fieldName, 'marked', postId, 1.0);
                WPFE.elements.addEditButton($element, fieldName, postId);
                count++;
            }
        });
        
        // Look for elements with data-wpfe attributes
        $('[data-wpfe-field]').each(function() {
            var $element = $(this);
            
            // Skip if already processed
            if ($element.hasClass('wpfe-editable')) {
                return;
            }
            
            var fieldName = $element.attr('data-wpfe-field');
            var postId = $element.attr('data-wpfe-post-id');
            
            if (fieldName) {
                WPFE.elements.storeElement($element, fieldName, 'marked', postId, 1.0);
                WPFE.elements.addEditButton($element, fieldName, postId);
                count++;
            }
        });
        
        return count;
    };
    
    /**
     * Find WordPress core content elements (title, content, excerpt)
     * 
     * @return {number} Number of elements found
     */
    WPFE.elements.findCoreElements = function() {
        var count = 0;
        
        // Common selector patterns for WordPress themes
        var titleSelectors = [
            '.entry-title',
            '.post-title',
            'h1.title',
            'h1.page-title',
            'article h1',
            '.main h1:first',
            '.content h1:first',
            '.site-content h1:first'
        ];
        
        var contentSelectors = [
            '.entry-content',
            '.post-content',
            'article .content',
            '.main-content',
            '.post-body',
            '.post-entry',
            'article .entry'
        ];
        
        var excerptSelectors = [
            '.entry-excerpt',
            '.entry-summary',
            '.post-excerpt',
            '.post-summary',
            '.excerpt',
            '.summary'
        ];
        
        // Try to find the title
        for (var i = 0; i < titleSelectors.length; i++) {
            var $titleElement = $(titleSelectors[i]);
            if ($titleElement.length === 1) {
                WPFE.elements.storeElement($titleElement, 'post_title', 'core', wpfe_data.post_id, 0.8);
                WPFE.elements.addEditButton($titleElement, 'post_title', wpfe_data.post_id);
                count++;
                break;
            }
        }
        
        // Try to find the content
        for (var j = 0; j < contentSelectors.length; j++) {
            var $contentElement = $(contentSelectors[j]);
            if ($contentElement.length === 1) {
                WPFE.elements.storeElement($contentElement, 'post_content', 'core', wpfe_data.post_id, 0.8);
                WPFE.elements.addEditButton($contentElement, 'post_content', wpfe_data.post_id);
                count++;
                break;
            }
        }
        
        // Try to find the excerpt
        for (var k = 0; k < excerptSelectors.length; k++) {
            var $excerptElement = $(excerptSelectors[k]);
            if ($excerptElement.length === 1) {
                WPFE.elements.storeElement($excerptElement, 'post_excerpt', 'core', wpfe_data.post_id, 0.8);
                WPFE.elements.addEditButton($excerptElement, 'post_excerpt', wpfe_data.post_id);
                count++;
                break;
            }
        }
        
        return count;
    };
    
    /**
     * Find elements by matching content against known values
     * Uses the page_content object from wpfe_data
     * 
     * @return {number} Number of elements found
     */
    WPFE.elements.findElementsByContent = function() {
        var count = 0;
        
        // Skip if no page content available
        if (!wpfe_data.page_content || Object.keys(wpfe_data.page_content).length === 0) {
            return count;
        }
        
        // Potential content containers
        var contentElements = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'div', 'article', 'section',
            '.content', '.entry', '.post', '.page'
        ];
        
        // For each content field we have
        for (var field in wpfe_data.page_content) {
            if (wpfe_data.page_content.hasOwnProperty(field)) {
                var content = wpfe_data.page_content[field];
                
                // Skip empty content
                if (!content || content.length < 3) {
                    continue;
                }
                
                // Normalize content for comparison
                var normalizedContent = WPFE.elements.normalizeText(content);
                
                // Try to find matching elements
                $(contentElements.join(',')).each(function() {
                    // Skip elements that already have edit buttons
                    if ($(this).hasClass('wpfe-editable') || $(this).find('.wpfe-edit-button').length > 0) {
                        return;
                    }
                    
                    var elementText = $(this).text();
                    
                    // Skip empty elements or very short text
                    if (!elementText || elementText.length < 3) {
                        return;
                    }
                    
                    // Normalize element text
                    var normalizedElementText = WPFE.elements.normalizeText(elementText);
                    
                    // Calculate similarity
                    var similarity = WPFE.elements.calculateTextSimilarity(normalizedContent, normalizedElementText);
                    
                    // If match is close enough, add the element
                    // Use a lower threshold (0.25) to catch more potential matches
                    if (similarity >= 0.25) {
                        WPFE.elements.storeElement($(this), field, 'content_match', wpfe_data.post_id, similarity);
                        WPFE.elements.addEditButton($(this), field, wpfe_data.post_id);
                        count++;
                        
                        if (wpfe_data.debug_mode) {
                            console.log('[WPFE] Content match found for ' + field + ' with similarity ' + similarity);
                        }
                    }
                });
            }
        }
        
        return count;
    };
    
    /**
     * Normalize text for comparison
     * 
     * @param {string} text Text to normalize
     * @return {string} Normalized text
     */
    WPFE.elements.normalizeText = function(text) {
        if (!text) return '';
        
        // Convert to string if not already
        text = String(text);
        
        // Replace HTML entities and convert to lowercase
        return text.replace(/&nbsp;/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .toLowerCase();
    };
    
    /**
     * Calculate similarity between two text strings
     * Uses a simple Levenshtein distance implementation
     * 
     * @param {string} str1 First string
     * @param {string} str2 Second string
     * @return {number} Similarity score (0-1)
     */
    WPFE.elements.calculateTextSimilarity = function(str1, str2) {
        // If either string is empty, return 0
        if (!str1 || !str2) return 0;
        
        // If strings are identical, return 1
        if (str1 === str2) return 1;
        
        // Simple matching for direct content containing
        if (str1.includes(str2) || str2.includes(str1)) {
            // Calculate how much of the longer string is covered
            var longerStr = str1.length > str2.length ? str1 : str2;
            var shorterStr = str1.length > str2.length ? str2 : str1;
            
            return shorterStr.length / longerStr.length;
        }
        
        // For longer strings, use more sophisticated matching
        var maxLength = Math.max(str1.length, str2.length);
        if (maxLength > 100) {
            // For long strings, just compare the first 100 chars to avoid performance issues
            str1 = str1.substring(0, 100);
            str2 = str2.substring(0, 100);
        }
        
        // Simple Levenshtein distance
        var d = [];
        for (var i = 0; i <= str1.length; i++) {
            d[i] = [i];
        }
        
        for (var j = 0; j <= str2.length; j++) {
            d[0][j] = j;
        }
        
        for (i = 1; i <= str1.length; i++) {
            for (j = 1; j <= str2.length; j++) {
                var cost = str1[i-1] === str2[j-1] ? 0 : 1;
                d[i][j] = Math.min(
                    d[i-1][j] + 1,     // deletion
                    d[i][j-1] + 1,     // insertion
                    d[i-1][j-1] + cost // substitution
                );
            }
        }
        
        var distance = d[str1.length][str2.length];
        var similarity = 1 - (distance / Math.max(str1.length, str2.length));
        
        return similarity;
    };
    
    /**
     * Try to guess a field name from element properties
     * 
     * @param {Object} $element jQuery element
     * @return {string|null} Guessed field name or null
     */
    WPFE.elements.guessFieldName = function($element) {
        var id = $element.attr('id') || '';
        var classes = $element.attr('class') || '';
        var name = $element.attr('name') || '';
        
        // Check common patterns in ID
        if (id) {
            // Common WordPress patterns
            if (id.match(/^post-title/) || id.match(/title/i)) {
                return 'post_title';
            }
            if (id.match(/^post-content/) || id.match(/content/i)) {
                return 'post_content';
            }
            if (id.match(/^post-excerpt/) || id.match(/excerpt/i)) {
                return 'post_excerpt';
            }
            if (id.match(/featured-image/) || id.match(/post-thumbnail/i)) {
                return 'featured_image';
            }
            
            // Check for field name in ID
            if (id.match(/^field-/)) {
                return id.replace('field-', '');
            }
        }
        
        // Check common patterns in classes
        if (classes) {
            var classArray = classes.split(' ');
            
            // Common WordPress patterns
            if (classArray.includes('entry-title') || classes.match(/title/i)) {
                return 'post_title';
            }
            if (classArray.includes('entry-content') || classes.match(/content/i)) {
                return 'post_content';
            }
            if (classArray.includes('entry-excerpt') || classes.match(/excerpt/i)) {
                return 'post_excerpt';
            }
            
            // Check for field name in classes
            for (var i = 0; i < classArray.length; i++) {
                if (classArray[i].match(/^field-/)) {
                    return classArray[i].replace('field-', '');
                }
            }
        }
        
        // Check for field name in name attribute
        if (name) {
            return name;
        }
        
        return null;
    };
    
    // Register this module as ready
    WPFE.modulesReady['element-detection'] = true;
    
})(jQuery, WPFE);