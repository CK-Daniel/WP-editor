/**
 * WP Frontend Editor Elements Module
 * Handles discovery and management of editable elements
 */

var WPFE = WPFE || {};

WPFE.elements = (function($) {
    'use strict';
    
    // Mark this module as loaded - make sure to mark ourselves as loaded first thing
    if (!WPFE.modulesReady) {
        WPFE.modulesReady = {};
    }
    WPFE.modulesReady.elements = true;
    
    // Log module loading for debugging if the debug object exists
    if (WPFE.debug && WPFE.debug.modulesLoaded) {
        WPFE.debug.modulesLoaded.push('elements');
        console.log('[WPFE] Elements module loaded and marked as ready');
    }

    // Private functions
    /**
     * Add edit button to an element.
     * 
     * @param {jQuery} $element The element to add button to.
     * @param {string} fieldName The field name.
     * @param {number} postId The post ID.
     */
    function addEditButton($element, fieldName, postId) {
        // Safety checks
        if (!$element || !$element.length || !fieldName) {
            console.warn('[WPFE] Cannot add edit button: Invalid element or field name', fieldName);
            return;
        }
        
        try {
            console.log('[WPFE] Adding edit button for field:', fieldName, 'to element:', $element.prop('tagName'), $element.attr('class'));
            
            // Set button position class based on settings
            var buttonPosition = wpfe_data.button_position || 'top-right';
            var positionClass = 'wpfe-button-' + buttonPosition;
            
            console.log('[WPFE] Button position:', buttonPosition);
            
            // Set button style based on settings
            var buttonStyle = wpfe_data.button_style || 'icon-only';
            var buttonContent = '';
            
            if (buttonStyle === 'icon-only') {
                buttonContent = '<span class="dashicons dashicons-edit"></span>';
            } else if (buttonStyle === 'text-only') {
                buttonContent = '<span class="wpfe-button-text">' + (wpfe_data.i18n.edit || 'Edit') + '</span>';
            } else { // icon-text
                buttonContent = '<span class="dashicons dashicons-edit"></span><span class="wpfe-button-text">' + (wpfe_data.i18n.edit || 'Edit') + '</span>';
            }
            
            // Remove any existing edit buttons to prevent duplicates
            var existingButtons = $element.find('.wpfe-edit-button');
            if (existingButtons.length > 0) {
                console.log('[WPFE] Removing', existingButtons.length, 'existing buttons');
                existingButtons.remove();
            }
            
            // Add edit button with accessibility improvements
            var $button = $('<button type="button" class="wpfe-edit-button ' + positionClass + '" data-wpfe-field="' + fieldName + '" data-wpfe-post-id="' + postId + '" aria-label="' + (wpfe_data.i18n.edit_field || 'Edit') + ' ' + fieldName + '"></button>');
            $button.html(buttonContent);
            
            // Add the button to the element (always at the end for proper z-index)
            $element.append($button);
            console.log('[WPFE] Button added to DOM');
            
            // Ensure the element has position:relative if it's static
            if ($element.css('position') === 'static') {
                $element.css('position', 'relative');
                console.log('[WPFE] Set position:relative on element');
            }
            
            // Optimize button position for visibility
            optimizeButtonPosition($element, $button);
            
            // Add hover effect if enabled
            if (wpfe_data.button_hover) {
                $button.addClass('wpfe-button-hover');
                console.log('[WPFE] Added wpfe-button-hover class');
            }
            
            // Add a data attribute to track button status
            $element.attr('data-wpfe-has-button', 'true');
            
            // IMPORTANT: Force buttons to be always visible in debug mode
            if (wpfe_data.debug_mode) {
                console.log('[WPFE] Debug mode active - making button permanently visible');
                $button.css({
                    'opacity': '1',
                    'transform': 'scale(1)',
                    'visibility': 'visible',
                    'background-color': 'red', // Make it obvious for debugging
                    'z-index': '9999999',
                    'position': 'absolute'
                }).addClass('wpfe-force-visible');
                
                // For extremely challenging themes, create a duplicate button outside the normal DOM flow
                if (wpfe_data.force_visible) {
                    var $fixedButton = $button.clone();
                    $fixedButton
                        .css({
                            'position': 'fixed',
                            'top': '50px',
                            'right': '50px',
                            'z-index': '99999999',
                            'background-color': 'red'
                        })
                        .addClass('wpfe-emergency-button')
                        .appendTo('body');
                        
                    // Add a label to identify what field this controls
                    $fixedButton.append('<span style="margin-left:4px;font-size:11px;white-space:nowrap;overflow:hidden;max-width:100px;text-overflow:ellipsis;">' + fieldName + '</span>');
                }
                
                return;
            }
            
            // Ensure button is visible on hover with a small delay
            $element.on('mouseenter', function() {
                console.log('[WPFE] Element mouseenter event triggered');
                $button.css({
                    'opacity': '1',
                    'transform': 'scale(1) translateY(0)',
                    'visibility': 'visible'
                });
            });
            
            $element.on('mouseleave', function() {
                console.log('[WPFE] Element mouseleave event triggered');
                // Add a small delay before hiding for better usability
                setTimeout(function() {
                    if (!$button.is(':hover')) {
                        $button.css({
                            'opacity': '0',
                            'transform': 'scale(0.9) translateY(5px)'
                        });
                    }
                }, 200);
            });
            
            // Also ensure the button itself has proper hover behavior
            $button.on('mouseenter', function() {
                console.log('[WPFE] Button mouseenter event triggered');
                $(this).css({
                    'opacity': '1',
                    'transform': 'scale(1.05)',
                    'visibility': 'visible'
                });
            });
            
            $button.on('mouseleave', function() {
                console.log('[WPFE] Button mouseleave event triggered');
                if (!$element.is(':hover')) {
                    $(this).css({
                        'opacity': '0',
                        'transform': 'scale(0.9) translateY(5px)'
                    });
                }
            });
            
        } catch (e) {
            console.error('[WPFE] Error adding edit button:', e);
        }
    }

    /**
     * Optimize the position of the edit button for better visibility
     * 
     * @param {jQuery} $element The element containing the button
     * @param {jQuery} $button The button to position
     */
    function optimizeButtonPosition($element, $button) {
        // Skip positioning for fixed position buttons
        var position = wpfe_data.button_position || 'top-right';
        if (position === 'fixed-top-right' || position === 'fixed-bottom-right') {
            return;
        }
        
        // Check element dimensions
        var height = $element.outerHeight();
        var width = $element.outerWidth();
        
        // For very small elements, place button outside to avoid obscuring content
        if (height < 40 || width < 100) {
            // If very small height, place above or below
            if (height < 40) {
                if (position.indexOf('top') !== -1) {
                    $button.css({
                        'top': '-25px'
                    });
                } else {
                    $button.css({
                        'bottom': '-25px'
                    });
                }
            }
            
            // If very small width, adjust horizontal position
            if (width < 100) {
                if (position.indexOf('right') !== -1) {
                    $button.css({
                        'right': '0'
                    });
                } else {
                    $button.css({
                        'left': '0'
                    });
                }
            }
        }
        
        // For image elements, ensure button is visible
        if ($element.is('img') || $element.find('img').length === 1 && $element.children().length === 1) {
            $button.addClass('wpfe-button-over-image');
        }
    }

    /**
     * Identify elements by matching their content
     * This is a secondary identification method for when selectors fail
     * 
     * @param {string} fieldName The field name
     * @param {string} content The content to match
     * @param {string} contentType The type of content (heading, content, excerpt)
     */
    function identifyElementsByContent(fieldName, content, contentType) {
        var postId = wpfe_data.post_id;
        var potentialElements = [];
        
        if (!content || typeof content !== 'string' || content.length < 10) {
            return; // Need substantial content to match
        }
        
        // Create content excerpt for matching
        var contentExcerpt = content.substring(0, 50).trim();
        
        // Different element types to check based on content type
        var elementsToCheck = [];
        
        switch(contentType) {
            case 'heading':
                elementsToCheck = ['h1', 'h2', '.title', 'header'];
                break;
            case 'content':
                elementsToCheck = ['article', '.content', 'div.entry', '.post', 'main', '.text'];
                break;
            case 'excerpt':
                elementsToCheck = ['.summary', '.excerpt', 'p.intro', '.lead', '.description'];
                break;
            default:
                elementsToCheck = ['div', 'p', 'section', 'article'];
        }
        
        // Look through each potential element type
        $.each(elementsToCheck, function(i, selector) {
            $(selector).each(function() {
                var $element = $(this);
                
                // Skip elements that are already identified
                if ($element.hasClass('wpfe-editable')) {
                    return true; // Continue to next element
                }
                
                // Skip elements with very little content
                var elementText = $element.text().trim();
                if (elementText.length < 10) {
                    return true;
                }
                
                // For text content, normalize whitespace for comparison
                var normalizedElementText = elementText.replace(/\\s+/g, ' ');
                var normalizedContent = content.replace(/\\s+/g, ' ');
                
                // Check if element contains a significant portion of the field content
                if (normalizedElementText.indexOf(contentExcerpt) !== -1 ||
                    (normalizedContent.length > 20 && normalizedContent.indexOf(normalizedElementText) !== -1)) {
                    
                    // Calculate match quality based on content similarity
                    var similarity = WPFE.utils.calculateContentSimilarity(normalizedElementText, normalizedContent);
                    
                    // If good match, add to potential elements with score
                    if (similarity > 0.4) { // 40% similarity threshold
                        potentialElements.push({
                            element: $element,
                            score: similarity
                        });
                    }
                }
            });
        });
        
        // Sort potential elements by match score (highest first)
        potentialElements.sort(function(a, b) {
            return b.score - a.score;
        });
        
        // Take only the best match if available
        if (potentialElements.length > 0) {
            var bestMatch = potentialElements[0];
            
            // Make the element editable
            bestMatch.element.addClass('wpfe-editable')
                .attr('data-wpfe-field', fieldName)
                .attr('data-wpfe-post-id', postId)
                .attr('data-wpfe-identified-by', 'content-match')
                .attr('data-wpfe-match-score', bestMatch.score.toFixed(2));
            
            // Create edit button
            addEditButton(bestMatch.element, fieldName, postId);
            
            if (wpfe_data.debug_mode) {
                console.log('Identified element by content matching:', fieldName, bestMatch.score, bestMatch.element);
            }
        }
    }

    /**
     * Identify additional elements that may be editable but weren't matched by selectors
     * This uses heuristics to find potential editable content
     */
    function identifyPotentialEditableElements() {
        // Only do this if enabled in settings
        if (!wpfe_data.discover_fields) {
            return;
        }
        
        var postId = wpfe_data.post_id;
        var $mainContainer = $('.entry-content, .content, article, main').first();
        
        if (!$mainContainer.length) {
            return;
        }
        
        // Check direct children of the main container for potential content
        $mainContainer.children().each(function() {
            var $element = $(this);
            
            // Skip elements already labeled as editable
            if ($element.hasClass('wpfe-editable') || $element.find('.wpfe-editable').length) {
                return true; // Continue to next element
            }
            
            // Skip very small elements, navigation, etc.
            if ($element.height() < 30 || $element.width() < 100) {
                return true;
            }
            
            // Skip elements that appear to be navigation, comments, sidebars, etc.
            if ($element.is('nav, aside, footer, .navigation, .comments, .sidebar, .widgets, .menu, ul, ol')) {
                return true;
            }
            
            // Check if the element has a significant amount of content
            var text = $element.text().trim();
            if (text.length > 100) {
                // Attempt to identify what kind of field this might be
                var fieldName = guessFieldName($element);
                
                // Make editable if we found a likely field type
                if (fieldName) {
                    $element.addClass('wpfe-editable')
                        .attr('data-wpfe-field', fieldName)
                        .attr('data-wpfe-post-id', postId)
                        .attr('data-wpfe-identified-by', 'discovery')
                        .attr('data-wpfe-field-type', 'discovered');
                    
                    // Create edit button
                    addEditButton($element, fieldName, postId);
                    
                    if (wpfe_data.debug_mode) {
                        console.log('Discovered potential editable element:', fieldName, $element);
                    }
                }
            }
        });
    }

    /**
     * Try to guess what type of field an element represents
     * 
     * @param {jQuery} $element The jQuery element to analyze
     * @return {string|null} The guessed field name or null if unknown
     */
    function guessFieldName($element) {
        // If element has an ID, use that as a hint
        var id = $element.attr('id');
        if (id) {
            // Check for common ID patterns
            if (/^content|^main-content|text|body/.test(id)) {
                return 'content';
            }
            if (/title|heading|header/.test(id)) {
                return 'title';
            }
            if (/excerpt|summary|description/.test(id)) {
                return 'excerpt';
            }
            
            // If ID appears to be a field name format
            if (/^field[-_]/.test(id)) {
                return id.replace(/^field[-_]/, '');
            }
        }
        
        // Check element type and content
        if ($element.is('h1, h2, header > *, .title')) {
            return 'post_title';
        }
        
        // Check for image galleries
        if ($element.find('img').length > 1 || $element.hasClass('gallery') || $element.find('.gallery').length) {
            return 'gallery';
        }
        
        // Check for single featured image
        if ($element.is('.featured-image, .post-thumbnail') || 
            ($element.find('img').length === 1 && $element.text().trim().length < 20)) {
            return 'featured_image';
        }
        
        // Default to custom content field if we can't determine
        return 'custom_content';
    }

    // Public API
    return {
        /**
         * Initialize editable elements.
         */
        init: function() {
            console.log('[WPFE] Advanced Elements module initializing with AI-inspired multi-strategy detection');
            console.log('[WPFE] Debug mode active:', wpfe_data.debug_mode ? 'Yes' : 'No');
            
            // Ensure the WPFE global object and its properties exist to prevent errors
            if (!WPFE.core) {
                console.warn('[WPFE] Core module not found - creating minimal stub');
                WPFE.core = {
                    setEditButtons: function() {},
                    getActiveField: function() { return null; }
                };
            }
            
            // =====================================================================
            // INTELLIGENT FIELD DETECTION SYSTEM
            // Using multiple strategies with confidence scoring
            // =====================================================================
            
            // Track identified elements with confidence scores
            var identifiedElements = [];
            var confidenceThreshold = 0.5; // Minimum confidence to mark as editable
            
            // Get page content data for all potential matching strategies
            var pageContent = wpfe_data.page_content || {};
            var postId = wpfe_data.post_id;
            
            console.log('[WPFE] Page content available for matching:', Object.keys(pageContent));
            
            // =====================================================================
            // STRATEGY 1: CONTENT MATCHING USING ACTUAL FIELD DATA
            // Gets actual post data and compares to DOM content
            // =====================================================================
            function findElementsByContentMatching() {
                console.log('[WPFE] Running content-based field detection');
                var matches = [];
                
                // Only run if we have page content data
                if (!pageContent || Object.keys(pageContent).length === 0) {
                    console.log('[WPFE] No page content data available for content matching');
                    return matches;
                }
                
                // For each field in the content data, find potential matches
                Object.keys(pageContent).forEach(function(fieldName) {
                    var fieldValue = pageContent[fieldName];
                    
                    // Skip empty fields or non-string values
                    if (!fieldValue || typeof fieldValue !== 'string' || fieldValue.trim() === '') {
                        return;
                    }
                    
                    console.log('[WPFE] Searching for field:', fieldName, 'with value length:', fieldValue.length);
                    
                    // Prepare the field value for smart matching
                    var normalizedFieldValue = normalizeText(fieldValue);
                    var valueSnippet = normalizedFieldValue.substring(0, 50) + (normalizedFieldValue.length > 50 ? '...' : '');
                    
                    console.log('[WPFE] Field value snippet:', valueSnippet);
                    
                    // Find ALL text-containing elements in the DOM
                    var candidateElements = [];
                    
                    // Different scanning strategies based on field length
                    if (normalizedFieldValue.length < 100) {
                        // For short text, scan headings and small text containers
                        $('h1, h2, h3, .title, header *, .heading, p, div:not(:has(div))').each(function() {
                            var $element = $(this);
                            // Skip elements with almost no text or with many children
                            if ($element.text().trim().length > 5 && $element.children().length < 5) {
                                candidateElements.push($element);
                            }
                        });
                    } else {
                        // For longer content, scan potential content containers
                        $('article, .content, main, .entry-content, .post-content, section, [class*="content"], div:contains(' + 
                          normalizedFieldValue.substring(0, 20).replace(/[^\w\s]/g, '') + ')').each(function() {
                            var $element = $(this);
                            if ($element.text().trim().length > 50) {
                                candidateElements.push($element);
                            }
                        });
                    }
                    
                    console.log('[WPFE] Found', candidateElements.length, 'candidate elements for', fieldName);
                    
                    // For each candidate, calculate similarity to field content
                    candidateElements.forEach(function($element) {
                        var elementText = $element.text().trim();
                        var normalizedElementText = normalizeText(elementText);
                        
                        // Calculate similarity score (0-1)
                        var similarity;
                        try {
                            similarity = calculateContentSimilarity(normalizedElementText, normalizedFieldValue);
                        } catch (e) {
                            console.error('[WPFE] Error calculating content similarity:', e);
                            similarity = 0; // Set a safe default value
                        }
                        
                        // Log high-confidence matches for debugging
                        if (similarity > 0.7) {
                            console.log('[WPFE] High similarity match:', similarity.toFixed(2), 
                                        'Element:', $element.prop('tagName'), 
                                        'Class:', $element.attr('class') || 'none');
                        }
                        
                        // Only consider good matches
                        if (similarity > 0.5) {
                            matches.push({
                                element: $element,
                                fieldName: fieldName,
                                confidence: similarity,
                                strategy: 'content-match',
                                found: true
                            });
                        }
                    });
                });
                
                return matches;
            }
            
            // Text normalization helper - safely cleans up text for comparison
            function normalizeText(text) {
                try {
                    // Handle non-string inputs gracefully
                    if (!text) return '';
                    if (typeof text !== 'string') {
                        text = String(text);
                    }
                    
                    return text.trim()
                        .toLowerCase()
                        .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
                        .replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with space
                        .replace(/[^\w\s.,?!-]/g, ''); // Remove special characters except basic punctuation
                } catch (e) {
                    console.error('[WPFE] Error in normalizeText:', e);
                    return '';
                }
            }
            
            // Calculate similarity between two text strings - optimized for performance and safety
            function calculateContentSimilarity(str1, str2) {
                try {
                    // Input validation
                    if (!str1 || !str2) return 0;
                    if (typeof str1 !== 'string' || typeof str2 !== 'string') {
                        str1 = String(str1);
                        str2 = String(str2);
                    }
                    
                    // Normalize strings
                    str1 = normalizeText(str1);
                    str2 = normalizeText(str2);
                    
                    // Handle empty strings after normalization
                    if (!str1 || !str2) return 0;
                    
                    // Exact match
                    if (str1 === str2) return 1;
                    
                    // Quick length check - if strings are drastically different sizes, they're probably not related
                    var lengthRatio = Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
                    if (lengthRatio < 0.3) {
                        return lengthRatio * 0.5; // Still give some small confidence if text appears in a much larger context
                    }
                    
                    // One string contains the other
                    if (str1.indexOf(str2) !== -1) return 0.8 * (str2.length / str1.length);
                    if (str2.indexOf(str1) !== -1) return 0.8 * (str1.length / str2.length);
                    
                    // Performance optimization: For very long strings, only compare first 500 chars
                    if (str1.length > 500 || str2.length > 500) {
                        var shortStr1 = str1.substring(0, 500);
                        var shortStr2 = str2.substring(0, 500);
                        
                        // If beginning parts match well, that's often enough
                        if (shortStr1.indexOf(shortStr2.substring(0, 100)) !== -1 || 
                            shortStr2.indexOf(shortStr1.substring(0, 100)) !== -1) {
                            return 0.75;
                        }
                    }
                    
                    // Check for first paragraph/sentence match (good for titles and short content)
                    var firstPara1 = str1.split(/[.!?]\s+/)[0] || str1;
                    var firstPara2 = str2.split(/[.!?]\s+/)[0] || str2;
                    
                    if (firstPara1 === firstPara2) return 0.9;
                    
                    // Check for significant words in common (faster than substring for long text)
                    var words1 = str1.split(/\s+/);
                    var words2 = str2.split(/\s+/);
                    
                    // Optimization: Only use first 100 words for very long texts
                    if (words1.length > 100) words1 = words1.slice(0, 100);
                    if (words2.length > 100) words2 = words2.slice(0, 100);
                    
                    var sharedWords = 0;
                    var significantWords = 0;
                    
                    // Create a Set for faster lookups in large word arrays
                    var words2Set = new Set(words2);
                    
                    words1.forEach(function(word) {
                        // Only count significant words (longer than 3 chars)
                        if (word.length > 3) {
                            significantWords++;
                            if (words2Set.has(word)) sharedWords++;
                        }
                    });
                    
                    // If we have significant shared words, that's a good signal
                    if (significantWords > 0 && sharedWords > 0) {
                        return 0.3 + (0.6 * (sharedWords / significantWords));
                    }
                    
                    // Last resort for important but short content: common substring
                    if (str1.length < 200 && str2.length < 200) {
                        var longestCommonSubstring = findLongestCommonSubstring(str1, str2);
                        var lcsLength = longestCommonSubstring.length;
                        
                        if (lcsLength > 15) {
                            return 0.5 + (0.4 * (lcsLength / Math.max(str1.length, str2.length)));
                        }
                    }
                    
                    // Minimal confidence for very little similarity
                    return 0.1;
                } catch (e) {
                    console.error('[WPFE] Error in calculateContentSimilarity:', e);
                    return 0;
                }
            }
            
            // Find longest common substring - optimized for speed and memory
            function findLongestCommonSubstring(str1, str2) {
                try {
                    if (!str1 || !str2) return '';
                    
                    // For very long strings, do suffix-based optimization
                    if (str1.length > 1000 || str2.length > 1000) {
                        // Just check first 500 chars for long content
                        str1 = str1.substring(0, 500);
                        str2 = str2.substring(0, 500);
                    }
                    
                    // Use dynamic programming approach for smaller strings
                    var m = str1.length;
                    var n = str2.length;
                    var max = 0;
                    var end = 0;
                    
                    // Create matrix only for current and previous row to save memory
                    var prevRow = Array(n+1).fill(0);
                    var currRow = Array(n+1).fill(0);
                    
                    for (var i = 1; i <= m; i++) {
                        for (var j = 1; j <= n; j++) {
                            if (str1[i-1] === str2[j-1]) {
                                currRow[j] = prevRow[j-1] + 1;
                                if (currRow[j] > max) {
                                    max = currRow[j];
                                    end = i;
                                }
                            } else {
                                currRow[j] = 0;
                            }
                        }
                        // Swap rows for next iteration
                        var temp = prevRow;
                        prevRow = currRow;
                        currRow = temp;
                        currRow.fill(0);
                    }
                    
                    return max > 0 ? str1.substring(end - max, end) : '';
                } catch (e) {
                    console.error('[WPFE] Error in findLongestCommonSubstring:', e);
                    return '';
                }
            }
            
            // =====================================================================
            // STRATEGY 2: SELECTOR-BASED IDENTIFICATION
            // Uses selectors with theme/builder detection
            // =====================================================================
            function findElementsBySelectors() {
                console.log('[WPFE] Running selector-based field detection');
                var matches = [];
                
                // Detect builder/theme first
                var detectedFrameworks = [];
                // Elementor detection
                if ($('body').hasClass('elementor-page') || $('.elementor').length)
                    detectedFrameworks.push('elementor');
                
                // WPBakery detection
                if ($('.vc_row').length || $('[class*="vc_"]').length)
                    detectedFrameworks.push('wpbakery');
                
                // Divi detection
                if ($('.et-db').length || $('.et_pb_section').length)
                    detectedFrameworks.push('divi');
                
                // Beaver Builder detection
                if ($('.fl-module').length)
                    detectedFrameworks.push('beaver');
                
                // Fusion/Avada detection
                if ($('.fusion-builder-row').length)
                    detectedFrameworks.push('fusion');
                
                // Oxygen Builder detection
                if ($('.ct-section').length || $('[class*="-oxy-"]').length)
                    detectedFrameworks.push('oxygen');
                
                // Bricks Builder detection
                if ($('.brxe-').length || $('[class*="bricks-"]').length)
                    detectedFrameworks.push('bricks');
                
                // Brizy detection
                if ($('.brz-').length)
                    detectedFrameworks.push('brizy');
                
                // SiteOrigin detection
                if ($('.panel-grid').length || $('.so-panel').length)
                    detectedFrameworks.push('siteorigin');
                
                // Gutenberg detection
                if ($('.wp-block').length || $('.block-editor-block-list__block').length)
                    detectedFrameworks.push('gutenberg');
                
                // GeneratePress detection
                if ($('body').hasClass('generate-press') || $('.site-content.container').length || $('.generate-content-area').length)
                    detectedFrameworks.push('generatepress');

                // OceanWP detection
                if ($('body').hasClass('oceanwp') || $('#ocean-main').length || $('.site-main.clr').length)
                    detectedFrameworks.push('oceanwp');
                   
                // Genesis detection
                if ($('body').hasClass('genesis') || $('.site-inner').length && $('.content-sidebar-wrap').length)
                    detectedFrameworks.push('genesis');
                    
                // Neve detection
                if ($('body').hasClass('neve') || $('.nv-content-wrap').length || $('.neve-main').length)
                    detectedFrameworks.push('neve');
                    
                // Storefront detection
                if ($('body').hasClass('storefront') || $('.storefront-primary-navigation').length)
                    detectedFrameworks.push('storefront');
                    
                // Blocksy detection
                if ($('body').hasClass('ct-loading') || $('.ct-container').length)
                    detectedFrameworks.push('blocksy');
                    
                // Newspaper/magazine theme detection
                if ($('body').hasClass('td-newspaper') || $('.td-main-content').length || $('.herald-main-content').length)
                    detectedFrameworks.push('newspaper');
                
                // WooCommerce-focused themes
                if ($('.woocommerce').length && $('.product').length)
                    detectedFrameworks.push('woocommerce-theme');
                
                // Theme detection - common themes
                if ($('body').hasClass('kadence'))
                    detectedFrameworks.push('kadence');
                if ($('body').hasClass('astra'))
                    detectedFrameworks.push('astra');
                if ($('body').hasClass('twentytwentythree') || $('body').hasClass('twentytwentytwo') || $('body').hasClass('twentytwentyone') || $('body').hasClass('twentytwenty'))
                    detectedFrameworks.push('twentyseries');
                
                // Generic framework detection for unknown themes
                if (detectedFrameworks.length === 0) {
                    console.log('[WPFE] No known theme/builder detected, applying universal detection');
                    
                    // Check for common theme patterns
                    if ($('.site-main').length || $('.main-content').length) 
                        detectedFrameworks.push('generic-theme');
                        
                    // Look for other common theme wrapper classes
                    if ($('.container').length && $('.row').length) 
                        detectedFrameworks.push('bootstrap-based');
                        
                    // Completely custom theme fallback - add as default
                    detectedFrameworks.push('custom-theme');
                }
                
                console.log('[WPFE] Detected frameworks:', detectedFrameworks.join(', ') || 'none');
                
                // Add helpful debug logs
                if (wpfe_data.debug_mode) {
                    console.log('[WPFE] Document body class:', $('body').attr('class'));
                    console.log('[WPFE] Total elements in DOM:', $('*').length);
                    console.log('[WPFE] Potential containers:', $('main, article, .content, .site-content').length);
                }
                
                // Define field selector sets with confidence scores
                var fieldSelectorSets = {
                    post_title: [
                        { selector: '.entry-title, .post-title', confidence: 0.9 },
                        { selector: 'h1.title, h1.page-title, .site-title h1', confidence: 0.8 },
                        { selector: 'article h1:first-child, header h1, .wp-block-post-title', confidence: 0.7 },
                        { selector: '.elementor-heading-title.elementor-size-xl, .elementor-heading-title.elementor-size-xxl', confidence: 0.6 },
                        { selector: 'h1', confidence: 0.5 },
                        // Additional title selectors for various themes
                        { selector: '.post-header h1, .entry-header h1, .page-header h1', confidence: 0.85 },
                        { selector: '[class*="title"]:header, [class*="heading"]:header', confidence: 0.7 },
                        { selector: '.title-container h1, .page-title-inner h1', confidence: 0.75 },
                        { selector: '.main-title, .site-title', confidence: 0.7 }
                    ],
                    post_content: [
                        { selector: '.entry-content, .post-content', confidence: 0.9 },
                        { selector: 'article .content-area, .wp-block-post-content', confidence: 0.8 },
                        { selector: '.content, main > .container', confidence: 0.7 },
                        { selector: 'article > div, .post > div', confidence: 0.6 },
                        { selector: 'main, article', confidence: 0.5 },
                        // Additional content selectors
                        { selector: '.post-body, .entry-body, .page-content, .post-text', confidence: 0.85 },
                        { selector: '.main-content, #content, .site-content', confidence: 0.7 },
                        { selector: '.single-content, .post-inner, .page-inner', confidence: 0.75 },
                        { selector: '.type-post, .type-page', confidence: 0.65 }
                    ],
                    post_excerpt: [
                        { selector: '.entry-summary, .excerpt, .post-excerpt', confidence: 0.9 },
                        { selector: '.summary, .post-summary', confidence: 0.7 },
                        // Additional excerpt selectors
                        { selector: '.post-excerpt-container, .excerpt-container', confidence: 0.85 },
                        { selector: '.card-text, .entry-intro', confidence: 0.7 }
                    ],
                    featured_image: [
                        { selector: '.post-thumbnail img, .featured-image img', confidence: 0.9 },
                        { selector: '.wp-post-image, .attachment-post-thumbnail', confidence: 0.8 },
                        { selector: 'article img:first, .entry-content img:first', confidence: 0.6 }
                    ]
                };
                
                // Add framework-specific selectors
                // Elementor selectors
                if (detectedFrameworks.includes('elementor')) {
                    fieldSelectorSets.post_title.push({ selector: '.elementor-heading-title', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.elementor-widget-text-editor, .elementor-text-editor', confidence: 0.7 });
                    fieldSelectorSets.featured_image.push({ selector: '.elementor-widget-image img', confidence: 0.7 });
                }
                
                // Divi selectors
                if (detectedFrameworks.includes('divi')) {
                    fieldSelectorSets.post_title.push({ selector: '.et_pb_text h1, .et_pb_title_container h1', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.et_pb_text_inner, .et_pb_post_content', confidence: 0.7 });
                    fieldSelectorSets.featured_image.push({ selector: '.et_pb_image img', confidence: 0.7 });
                }
                
                // WPBakery selectors
                if (detectedFrameworks.includes('wpbakery')) {
                    fieldSelectorSets.post_title.push({ selector: '.wpb_text_column h1', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.wpb_text_column', confidence: 0.7 });
                    fieldSelectorSets.featured_image.push({ selector: '.wpb_single_image img', confidence: 0.7 });
                }
                
                // Oxygen Builder selectors
                if (detectedFrameworks.includes('oxygen')) {
                    fieldSelectorSets.post_title.push({ selector: '.oxy-rich-text h1, .oxy-post-title', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.oxy-rich-text, .oxy-inner-content', confidence: 0.7 });
                    fieldSelectorSets.featured_image.push({ selector: '.oxy-post-image img', confidence: 0.7 });
                }
                
                // Bricks Builder selectors
                if (detectedFrameworks.includes('bricks')) {
                    fieldSelectorSets.post_title.push({ selector: '.brxe-heading, [data-script-id*="heading"]', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.brxe-text, [data-script-id*="text"]', confidence: 0.7 });
                    fieldSelectorSets.featured_image.push({ selector: '.brxe-image img', confidence: 0.7 });
                }
                
                // Brizy selectors
                if (detectedFrameworks.includes('brizy')) {
                    fieldSelectorSets.post_title.push({ selector: '.brz-title, .brz-heading', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.brz-text, .brz-rich-text', confidence: 0.7 });
                    fieldSelectorSets.featured_image.push({ selector: '.brz-image img', confidence: 0.7 });
                }
                
                // SiteOrigin selectors
                if (detectedFrameworks.includes('siteorigin')) {
                    fieldSelectorSets.post_title.push({ selector: '.so-widget-sow-headline h1', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.so-widget-sow-editor, .panel-widget-style', confidence: 0.7 });
                    fieldSelectorSets.featured_image.push({ selector: '.so-widget-image', confidence: 0.7 });
                }
                
                // Beaver Builder selectors
                if (detectedFrameworks.includes('beaver')) {
                    fieldSelectorSets.post_title.push({ selector: '.fl-heading, .fl-module-heading', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.fl-rich-text, .fl-module-rich-text', confidence: 0.7 });
                    fieldSelectorSets.featured_image.push({ selector: '.fl-photo-img', confidence: 0.7 });
                }
                
                // Gutenberg selectors
                if (detectedFrameworks.includes('gutenberg')) {
                    fieldSelectorSets.post_title.push({ selector: '.wp-block-post-title', confidence: 0.8 });
                    fieldSelectorSets.post_content.push({ selector: '.wp-block-post-content', confidence: 0.8 });
                    fieldSelectorSets.featured_image.push({ selector: '.wp-block-post-featured-image img', confidence: 0.8 });
                }
                
                // Theme-specific selectors
                if (detectedFrameworks.includes('kadence')) {
                    fieldSelectorSets.post_title.push({ selector: '.entry-title .kadence-title', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.entry-content-wrap, .kadence-content-wrap', confidence: 0.7 });
                }
                
                if (detectedFrameworks.includes('astra')) {
                    fieldSelectorSets.post_title.push({ selector: '.entry-title .ast-title', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.ast-post-content-wrap, .ast-content-wrap', confidence: 0.7 });
                }
                
                // GeneratePress theme specific selectors
                if (detectedFrameworks.includes('generatepress')) {
                    fieldSelectorSets.post_title.push({ selector: '.entry-header .entry-title', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.generate-content-area, .inside-article .entry-content', confidence: 0.7 });
                }
                
                // OceanWP theme specific selectors
                if (detectedFrameworks.includes('oceanwp')) {
                    fieldSelectorSets.post_title.push({ selector: '.entry-title, .single-post-title', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '#content-wrap .entry, .entry-content', confidence: 0.7 });
                }
                
                // Genesis theme specific selectors
                if (detectedFrameworks.includes('genesis')) {
                    fieldSelectorSets.post_title.push({ selector: '.entry-title, .content .entry-header .entry-title', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.entry-content, .content .entry', confidence: 0.7 });
                }
                
                // Twenty series theme specific selectors 
                if (detectedFrameworks.includes('twentyseries')) {
                    fieldSelectorSets.post_title.push({ selector: '.entry-header .entry-title, .wp-block-post-title', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.entry-content, .wp-block-post-content', confidence: 0.7 });
                }
                
                // Newspaper/magazine theme specific selectors
                if (detectedFrameworks.includes('newspaper')) {
                    fieldSelectorSets.post_title.push({ selector: '.entry-title, .td-post-title h1, .herald-entry-title', confidence: 0.7 });
                    fieldSelectorSets.post_content.push({ selector: '.td-post-content, .herald-entry-content, .entry-content', confidence: 0.7 });
                }
                
                // Generic or custom theme fallback
                if (detectedFrameworks.includes('custom-theme') || detectedFrameworks.includes('generic-theme')) {
                    // Add very broad selectors with lower confidence for custom themes
                    fieldSelectorSets.post_title.push({ selector: 'h1:first-of-type, header h1, article h1, .title, .main-title', confidence: 0.5 });
                    fieldSelectorSets.post_content.push({ selector: 'article > *, .entry > *, .post > *, .content > *, main > *', confidence: 0.5 });
                    
                    // Target standard article structures
                    fieldSelectorSets.post_title.push({ selector: '*[class*="title"], *[class*="heading"], *[id*="title"], *[id*="heading"]', confidence: 0.4 });
                    fieldSelectorSets.post_content.push({ selector: '*[class*="content"], *[class*="entry"], *[id*="content"], *[class*="text-container"]', confidence: 0.4 });
                }
                
                // Process each field type
                Object.keys(fieldSelectorSets).forEach(function(fieldName) {
                    var selectorSets = fieldSelectorSets[fieldName];
                    
                    selectorSets.forEach(function(set) {
                        var elements = $(set.selector);
                        console.log('[WPFE] Field:', fieldName, 'Selector:', set.selector, 'Elements:', elements.length);
                        
                        elements.each(function() {
                            var $element = $(this);
                            
                            // Skip very small or empty elements
                            if ($element.text().trim().length < 3) {
                                return;
                            }
                            
                            matches.push({
                                element: $element,
                                fieldName: fieldName,
                                confidence: set.confidence,
                                strategy: 'selector',
                                found: true
                            });
                        });
                    });
                });
                
                return matches;
            }
            
            // =====================================================================
            // STRATEGY 3: SEMANTIC STRUCTURE ANALYSIS
            // Analyzes page structure and element relationships
            // =====================================================================
            function findElementsBySemanticStructure() {
                console.log('[WPFE] Running semantic structure analysis');
                var matches = [];
                
                // Get main content container
                var $main = $('main, #main, .main, [role="main"], #content, .content, .site-content, .entry-content').first();
                var $header = $('header, .header, .site-header, .entry-header').first();
                
                // If we found a main container, analyze its children
                if ($main.length) {
                    console.log('[WPFE] Main content container found:', $main.prop('tagName'), $main.attr('class'));
                    
                    // Find the primary heading (usually post title)
                    var $mainHeading = $main.find('h1, .entry-title, .post-title, .title').first();
                    if ($mainHeading.length) {
                        matches.push({
                            element: $mainHeading,
                            fieldName: 'post_title',
                            confidence: 0.8,
                            strategy: 'semantic',
                            found: true
                        });
                    }
                    
                    // Find main content area (usually largest text container)
                    var largestTextContainer = findLargestTextContainer($main);
                    if (largestTextContainer) {
                        matches.push({
                            element: largestTextContainer,
                            fieldName: 'post_content',
                            confidence: 0.7,
                            strategy: 'semantic',
                            found: true
                        });
                    }
                }
                
                // If we found a header, check for title elements
                if ($header.length) {
                    console.log('[WPFE] Header container found:', $header.prop('tagName'), $header.attr('class'));
                    
                    // Find title within header
                    var $headerTitle = $header.find('h1, h2, .title').first();
                    if ($headerTitle.length) {
                        matches.push({
                            element: $headerTitle,
                            fieldName: 'post_title',
                            confidence: 0.85,
                            strategy: 'semantic',
                            found: true
                        });
                    }
                }
                
                // Check if excerpt might be present
                var $excerpt = $('.excerpt, .entry-summary, .summary').first();
                if ($excerpt.length) {
                    matches.push({
                        element: $excerpt,
                        fieldName: 'post_excerpt',
                        confidence: 0.8,
                        strategy: 'semantic',
                        found: true
                    });
                }
                
                return matches;
            }
            
            // Find the largest text container within an element
            function findLargestTextContainer($container) {
                var candidates = [];
                
                $container.find('div, section, article').each(function() {
                    var $element = $(this);
                    var textLength = $element.text().trim().length;
                    
                    // Only consider elements with substantial text
                    if (textLength > 100) {
                        candidates.push({
                            element: $element,
                            textLength: textLength
                        });
                    }
                });
                
                // Sort by text length (descending)
                candidates.sort(function(a, b) {
                    return b.textLength - a.textLength;
                });
                
                return candidates.length ? candidates[0].element : null;
            }
            
            // Universal fallback strategy for custom themes with unique structures
            function findElementsByUniversalPatterns() {
                console.log('[WPFE] Running universal pattern recognition for custom themes');
                var matches = [];
                var postId = wpfe_data.post_id;
                
                // 1. Title detection: Find the most prominent heading
                // Look for the first visible heading in the page (most likely to be the title)
                $('h1, h2, .title, [class*="title"], [id*="title"]').each(function() {
                    var $element = $(this);
                    
                    // Skip invisible elements or too small elements
                    if (!$element.is(':visible') || $element.text().trim().length < 3) {
                        return true;
                    }
                    
                    // Skip elements that are likely navigation or site titles
                    if ($element.closest('nav, header.site-header, footer, .navigation, .menu').length) {
                        return true;
                    }
                    
                    // Skip elements that already have edit buttons
                    if ($element.hasClass('wpfe-editable')) {
                        return true;
                    }
                    
                    // Calculate a confidence score based on position, size and prominence
                    var confidence = 0.4; // Base confidence
                    
                    // Boost confidence for h1 elements
                    if ($element.is('h1')) {
                        confidence += 0.1;
                    }
                    
                    // Boost for elements with "title" in class or ID
                    if ($element.attr('class') && $element.attr('class').indexOf('title') > -1) {
                        confidence += 0.05;
                    }
                    
                    // Boost for first heading in the main content area
                    if ($element.closest('main, article, .content, #content').length) {
                        confidence += 0.1;
                    }
                    
                    // Title elements are typically not gigantic text blocks
                    if ($element.text().trim().length < 150) {
                        confidence += 0.05;
                    }
                    
                    matches.push({
                        element: $element,
                        fieldName: 'post_title',
                        confidence: confidence,
                        strategy: 'universal-pattern',
                        found: true
                    });
                    
                    // Only use the first good heading match
                    return false;
                });
                
                // 2. Content detection: Find elements with substantial text
                // Look for large content blocks that likely contain the main content
                $('div, article, section, .content, [class*="content"], [id*="content"]').each(function() {
                    var $element = $(this);
                    var textLength = $element.text().trim().length;
                    
                    // Skip tiny elements, menu items, navigation elements, etc.
                    if (textLength < 200 || $element.closest('nav, header, footer, .menu, .navigation').length) {
                        return true;
                    }
                    
                    // Skip elements that already have edit buttons
                    if ($element.hasClass('wpfe-editable')) {
                        return true;
                    }
                    
                    // Skip elements with many internal elements (likely layout containers)
                    if ($element.children().length > 15) {
                        return true;
                    }
                    
                    // Calculate confidence based on content amount and semantic hints
                    var confidence = 0.35; // Base confidence
                    
                    // More text generally means more likely to be main content
                    if (textLength > 500) {
                        confidence += 0.1;
                    }
                    
                    // Boost for semantic class names
                    if ($element.attr('class')) {
                        var classAttr = $element.attr('class');
                        if (classAttr.indexOf('content') > -1) confidence += 0.1;
                        if (classAttr.indexOf('entry') > -1) confidence += 0.05;
                        if (classAttr.indexOf('post') > -1) confidence += 0.05;
                        if (classAttr.indexOf('article') > -1) confidence += 0.05;
                        if (classAttr.indexOf('text') > -1) confidence += 0.05;
                    }
                    
                    // Boost for semantic element types
                    if ($element.is('article')) confidence += 0.1;
                    
                    // Only proceed if confidence is reasonable
                    if (confidence >= 0.5) {
                        matches.push({
                            element: $element,
                            fieldName: 'post_content',
                            confidence: confidence,
                            strategy: 'universal-pattern',
                            found: true
                        });
                    }
                });
                
                // 3. Featured image detection: Find prominent images
                $('img, .featured-image, [class*="featured"], .post-thumbnail').each(function() {
                    var $element = $(this);
                    
                    // Skip tiny images or hidden elements
                    if (!$element.is(':visible') || $element.width() < 100 || $element.height() < 100) {
                        return true;
                    }
                    
                    // Skip elements that already have edit buttons
                    if ($element.hasClass('wpfe-editable')) {
                        return true;
                    }
                    
                    // Skip icons and very small images (likely decorative)
                    if ($element.width() < 200 && $element.height() < 200) {
                        return true;
                    }
                    
                    var confidence = 0.4;
                    
                    // Boost for images with telling class names
                    if ($element.attr('class')) {
                        var classAttr = $element.attr('class');
                        if (classAttr.indexOf('featured') > -1) confidence += 0.15;
                        if (classAttr.indexOf('thumbnail') > -1) confidence += 0.1;
                        if (classAttr.indexOf('large') > -1) confidence += 0.05;
                    }
                    
                    // Large images near the top of the page are often featured images
                    var elementTop = $element.offset().top;
                    var windowHeight = $(window).height();
                    if (elementTop < windowHeight) {
                        confidence += 0.1;
                    }
                    
                    // Target element should be the image's parent if an img
                    var targetElement = $element.is('img') ? $element.parent() : $element;
                    
                    // Only proceed if reasonable confidence
                    if (confidence >= 0.5) {
                        matches.push({
                            element: targetElement,
                            fieldName: 'featured_image',
                            confidence: confidence,
                            strategy: 'universal-pattern',
                            found: true
                        });
                    }
                });
                
                console.log('[WPFE] Universal pattern detection found', matches.length, 'potential elements');
                return matches;
            }
            
            // Define common field selectors for legacy support
            var coreFields = [
                { 
                    name: 'post_title', 
                    selector: '.entry-title, .post-title, h1.title, h2.title, .page-title',
                    contentType: 'heading',
                    priority: 'high'
                },
                { 
                    name: 'post_content', 
                    selector: '.entry-content, .post-content, .content, .page-content', 
                    contentType: 'content',
                    priority: 'medium'
                },
                { 
                    name: 'post_excerpt', 
                    selector: '.entry-summary, .excerpt, .post-excerpt, .post-summary',
                    contentType: 'excerpt',
                    priority: 'medium' 
                }
            ];
            
            // Add additional discoverable editable fields for better compatibility
            if (wpfe_data.discover_fields) {
                console.log('[WPFE] Field discovery mode enabled - adding additional selectors');
                
                // For Elementor
                if ($('.elementor').length) {
                    console.log('[WPFE] Elementor detected - adding Elementor-specific selectors');
                    coreFields.push({
                        name: 'elementor_content',
                        selector: '.elementor-widget-wrap, .elementor-widget-container',
                        contentType: 'content',
                        priority: 'medium'
                    });
                }
                
                // For WPBakery
                if ($('.wpb_row, .vc_row').length) {
                    console.log('[WPFE] WPBakery detected - adding WPBakery-specific selectors');
                    coreFields.push({
                        name: 'wpbakery_content',
                        selector: '.wpb_text_column, .wpb_content_element, .vc_column-inner',
                        contentType: 'content',
                        priority: 'medium'
                    });
                }
                
                // For Divi
                if ($('.et_pb_section').length) {
                    console.log('[WPFE] Divi detected - adding Divi-specific selectors');
                    coreFields.push({
                        name: 'divi_content',
                        selector: '.et_pb_text_inner, .et_pb_text, .et_pb_module',
                        contentType: 'content',
                        priority: 'medium'
                    });
                }
                
                // Add fallback general selectors that might contain content
                coreFields.push({
                    name: 'generic_content',
                    selector: 'section > div, article > div, .container > div > div, main > section, main > div',
                    contentType: 'content',
                    priority: 'low'
                });
            }
            
            // Log the selectors for debugging
            console.log('[WPFE] Post title selectors:', coreFields[0].selector);
            console.log('[WPFE] Post content selectors:', coreFields[1].selector);
            console.log('[WPFE] Post excerpt selectors:', coreFields[2].selector);
            
            // Get page content from server if available
            var pageContent = wpfe_data.page_content || {};
            
            // =====================================================================
            // RUN ALL IDENTIFICATION STRATEGIES AND COMBINE RESULTS
            // =====================================================================
            console.log('[WPFE] Running all field identification strategies');
            
            // Run each strategy and collect results
            var contentMatches = findElementsByContentMatching();
            var selectorMatches = findElementsBySelectors();
            var semanticMatches = findElementsBySemanticStructure();
            
            // Add a universal fallback strategy for challenging custom themes
            // This runs if we've found very few elements with the main strategies
            var universalMatches = [];
            if (contentMatches.length + selectorMatches.length + semanticMatches.length < 2) {
                console.log('[WPFE] Few matches found with standard strategies. Running universal fallback strategy for custom themes.');
                universalMatches = findElementsByUniversalPatterns();
            }
            
            // Combine all matches including universal fallback matches
            var allMatches = [].concat(contentMatches, selectorMatches, semanticMatches, universalMatches);
            
            console.log('[WPFE] Total potential matches found:', allMatches.length);
            console.log('[WPFE] Content matches:', contentMatches.length);
            console.log('[WPFE] Selector matches:', selectorMatches.length);
            console.log('[WPFE] Semantic matches:', semanticMatches.length);
            console.log('[WPFE] Universal fallback matches:', universalMatches.length);
            
            // Group matches by element to merge duplicates and intelligently consolidate
            var elementToMatchMap = {};
            var elementMatchCounts = {}; // Track how many strategies found each element
            
            // First pass: Group by element and count matches
            allMatches.forEach(function(match) {
                try {
                    var $element = match.element;
                    if (!$element || !$element.length) return; // Skip invalid elements
                    
                    // Create a unique ID for this DOM element
                    var elementId = $element.attr('id') || '';
                    var elementClass = $element.attr('class') || '';
                    var elementPath = $element.prop('tagName') + '#' + elementId + '.' + elementClass.replace(/\s+/g, '.');
                    
                    // Initialize tracking if first time seeing this element
                    if (!elementToMatchMap[elementPath]) {
                        elementToMatchMap[elementPath] = match;
                        elementMatchCounts[elementPath] = { 
                            count: 1,
                            strategies: [match.strategy],
                            fieldNames: [match.fieldName]
                        };
                    } else {
                        // Track the strategy and field name to detect different strategies agreeing
                        if (!elementMatchCounts[elementPath].strategies.includes(match.strategy)) {
                            elementMatchCounts[elementPath].strategies.push(match.strategy);
                        }
                        if (!elementMatchCounts[elementPath].fieldNames.includes(match.fieldName)) {
                            elementMatchCounts[elementPath].fieldNames.push(match.fieldName);
                        }
                        elementMatchCounts[elementPath].count++;
                        
                        // Update if this match has higher confidence
                        if (elementToMatchMap[elementPath].confidence < match.confidence) {
                            elementToMatchMap[elementPath] = match;
                        }
                    }
                } catch (e) {
                    console.error('[WPFE] Error processing match:', e);
                }
            });
            
            // Second pass: Calculate confidence boost based on strategy agreement
            Object.keys(elementToMatchMap).forEach(function(elementPath) {
                var match = elementToMatchMap[elementPath];
                var stats = elementMatchCounts[elementPath];
                
                // Base confidence from the best match
                var newConfidence = match.confidence;
                
                // Significant boost if multiple strategies agree on the same element and field
                if (stats.strategies.length > 1 && stats.fieldNames.length === 1) {
                    // Strong agreement on both element and field type
                    newConfidence += 0.15;
                    console.log('[WPFE] Strong agreement boost for ' + match.fieldName + 
                               ': multiple strategies (' + stats.strategies.join(', ') + ')');
                } 
                // Moderate boost if multiple matches from different strategies
                else if (stats.strategies.length > 1) {
                    // Different strategies found this element but disagree on field type
                    newConfidence += 0.08;
                    console.log('[WPFE] Moderate agreement boost: multiple strategies but different fields');
                }
                // Small boost for multiple matches of same strategy
                else if (stats.count > 1) {
                    newConfidence += 0.03;
                }
                
                // Content matching carries more weight for boosting
                if (stats.strategies.includes('content-match')) {
                    newConfidence += 0.1;
                    console.log('[WPFE] Content-match boost applied');
                }
                
                // Semantic structure has good context awareness
                if (stats.strategies.includes('semantic')) {
                    newConfidence += 0.05;
                }
                
                // Cap at 0.95 to avoid overconfidence
                match.confidence = Math.min(0.95, newConfidence);
                
                // Track boosting in the match
                match.boosted = (match.confidence !== newConfidence);
                match.originalConfidence = match.confidence;
            });
            
            // Convert map back to array and sort by confidence
            var bestMatches = Object.values(elementToMatchMap).sort(function(a, b) {
                return b.confidence - a.confidence;
            });
            
            console.log('[WPFE] Consolidated matches:', bestMatches.length);
            
            // Handle special case for debug mode
            if (wpfe_data.debug_mode && bestMatches.length === 0) {
                console.log('[WPFE] No matches found with intelligent strategies, falling back to legacy approach');
                
                // Fall back to legacy selector approach for debug mode
                $.each(coreFields, function(index, field) {
                    var elements = $(field.selector);
                    console.log('[WPFE] Legacy approach: searching for ' + field.name + ' elements');
                    console.log('[WPFE] Found ' + elements.length + ' potential elements for ' + field.name);
                    
                    elements.each(function() {
                        bestMatches.push({
                            element: $(this),
                            fieldName: field.name,
                            confidence: 0.5,
                            strategy: 'legacy-selector',
                            found: true
                        });
                    });
                });
            }
            
            // Mark matched elements as editable and add buttons
            bestMatches.forEach(function(match) {
                if (match.confidence >= confidenceThreshold) {
                    var $element = match.element;
                    var fieldName = match.fieldName;
                    var confidence = match.confidence;
                    var strategy = match.strategy;
                    
                    console.log('[WPFE] Processing high-confidence match:', 
                               'Field:', fieldName,
                               'Confidence:', confidence.toFixed(2),
                               'Strategy:', strategy,
                               'Element:', $element.prop('tagName'),
                               'Class:', $element.attr('class') || 'none');
                    
                    // Skip if element is too small or empty
                    if ($element.text().trim().length < 3) {
                        console.log('[WPFE] Skipping - element content too small');
                        return;
                    }
                    
                    // Make sure element has relative positioning for button placement
                    if ($element.css('position') === 'static') {
                        $element.css('position', 'relative');
                    }
                    
                    // Don't duplicate if already marked as editable
                    if (!$element.hasClass('wpfe-editable')) {
                        $element.addClass('wpfe-editable')
                            .attr('data-wpfe-field', fieldName)
                            .attr('data-wpfe-post-id', postId)
                            .attr('data-wpfe-identified-by', strategy)
                            .attr('data-wpfe-confidence', confidence.toFixed(2));
                        
                        // Add edit button with appropriate field name
                        addEditButton($element, fieldName, postId);
                        
                        // In debug mode, style based on confidence
                        if (wpfe_data.debug_mode) {
                            var confidenceColor = confidence > 0.8 ? 'green' : 
                                                 (confidence > 0.6 ? 'orange' : 'red');
                            $element.css({
                                'outline-color': confidenceColor,
                                'position': 'relative',
                                'z-index': '10000'
                            }).addClass('wpfe-force-visible');
                        }
                    } else {
                        // Update existing editable element if needed
                        if (!$element.attr('data-wpfe-has-button') || $element.find('.wpfe-edit-button').length === 0) {
                            addEditButton($element, fieldName, postId);
                        }
                    }
                } else {
                    console.log('[WPFE] Skipping low-confidence match:', 
                               match.fieldName, 
                               'Confidence:', match.confidence.toFixed(2));
                }
            });
            
            // Try to identify unlabeled elements as a fallback
            identifyPotentialEditableElements();
            
            // Setup progressive element discovery for slow-loading sites
            var discoveryAttempts = 0;
            var maxDiscoveryAttempts = 5;
            var initialDelay = 1000;
            
            // Progressive discovery function with retry logic
            // Start the first discovery attempt
            setTimeout(runProgressiveDiscovery, initialDelay);
            function runProgressiveDiscovery() {
                discoveryAttempts++;
                var editableElements = $('.wpfe-editable');
                var editButtons = $('.wpfe-edit-button');
                
                console.log('[WPFE] ==========================================');
                console.log('[WPFE] ELEMENT DISCOVERY CHECK - ATTEMPT ' + discoveryAttempts + '/' + maxDiscoveryAttempts);
                console.log('[WPFE] ==========================================');
                console.log('[WPFE] Total editable elements found:', editableElements.length);
                console.log('[WPFE] Total edit buttons created:', editButtons.length);
                console.log('[WPFE] Visible edit buttons:', $('.wpfe-edit-button:visible').length);
                
                // If no elements found or we're early in the discovery process
                if (editableElements.length === 0) {
                    console.warn('[WPFE] No editable elements found in attempt ' + discoveryAttempts + '!');
                    
                    // Try advanced discovery techniques based on attempt
                    if (discoveryAttempts >= 2) {
                        // On the second attempt, try content-based identification again with lower threshold
                        console.log('[WPFE] Trying content matching with lower threshold...');
                        
                        // Try re-running content matching with lower threshold
                        if (pageContent && Object.keys(pageContent).length > 0) {
                            Object.keys(pageContent).forEach(function(fieldName) {
                                var fieldValue = pageContent[fieldName];
                                
                                if (typeof fieldValue === 'string' && fieldValue.trim().length > 0) {
                                    // Only scan for significant content
                                    if (fieldValue.length > 30) {
                                        console.log('[WPFE] Re-scanning for field content:', fieldName);
                                        
                                        // Find ANY elements that might contain this text
                                        $('*').each(function() {
                                            var $element = $(this);
                                            
                                            // Skip tiny elements and those already marked
                                            if ($element.text().trim().length < 30 || $element.hasClass('wpfe-editable')) {
                                                return;
                                            }
                                            
                                            // Check content similarity with lower threshold
                                            var similarity;
                                            try {
                                                similarity = calculateContentSimilarity($element.text(), fieldValue);
                                            } catch (e) {
                                                console.error('[WPFE] Error calculating content similarity in recovery mode:', e);
                                                similarity = 0; // Safe default
                                            }
                                            if (similarity > 0.3) { // Lower threshold than normal
                                                console.log('[WPFE] Lower threshold match:', similarity.toFixed(2), 
                                                          'Element:', $element.prop('tagName'), 
                                                          'Field:', fieldName);
                                                
                                                $element.addClass('wpfe-editable')
                                                    .attr('data-wpfe-field', fieldName)
                                                    .attr('data-wpfe-post-id', postId)
                                                    .attr('data-wpfe-identified-by', 'recovery-content')
                                                    .attr('data-wpfe-confidence', similarity.toFixed(2));
                                                
                                                addEditButton($element, fieldName, postId);
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                    
                    // On the third attempt, try extra structural hints
                    if (discoveryAttempts >= 3) {
                        console.log('[WPFE] Trying to identify main content containers...');
                        
                        // Look for common structural patterns
                        $('article, .single, .post, main > *, #content > *, .main > *').each(function() {
                            var $element = $(this);
                            
                            // Skip tiny elements and those already marked
                            if ($element.text().trim().length < 50 || $element.hasClass('wpfe-editable')) {
                                return;
                            }
                            
                            $element.addClass('wpfe-editable')
                                .attr('data-wpfe-field', 'recovery_content')
                                .attr('data-wpfe-post-id', postId)
                                .attr('data-wpfe-identified-by', 'recovery-structure')
                                .attr('data-wpfe-confidence', '0.4');
                            
                            addEditButton($element, 'recovery_content', postId);
                        });
                    }
                    
                    // Last-ditch emergency identification on final attempt
                    if (discoveryAttempts >= maxDiscoveryAttempts - 1) {
                        console.log('[WPFE] Final attempt: Running emergency identification on ANY content...');
                        
                        // Try to make ANY significant content editable
                        $('h1, h2, p, div:not(:has(div))').each(function() {
                            var $element = $(this);
                            var text = $element.text().trim();
                            
                            // Only consider non-empty elements with reasonable text length
                            if (text.length > 20 && text.length < 5000 && !$element.hasClass('wpfe-editable')) {
                                $element.addClass('wpfe-editable')
                                    .attr('data-wpfe-field', 'emergency_content')
                                    .attr('data-wpfe-post-id', postId)
                                    .attr('data-wpfe-identified-by', 'emergency');
                                
                                addEditButton($element, 'emergency_content', postId);
                                
                                // Style very prominently
                                $element.css({
                                    'outline': '5px solid red',
                                    'background-color': 'rgba(255, 0, 0, 0.1)'
                                });
                            }
                        });
                    }
                    
                    // Schedule next attempt if we haven't hit the max
                    if (discoveryAttempts < maxDiscoveryAttempts) {
                        // Use progressive delay (1s, 2s, 3s, 5s)
                        var nextDelay = initialDelay * Math.min(discoveryAttempts * 1.5, 5);
                        console.log('[WPFE] Scheduling next discovery attempt in ' + (nextDelay/1000) + ' seconds...');
                        
                        setTimeout(runProgressiveDiscovery, nextDelay);
                        return; // Exit early, we'll continue in the next scheduled call
                    }
                }
                
                // Make all buttons highly visible in debug mode
                if (wpfe_data.debug_mode) {
                    $('.wpfe-edit-button').css({
                        'opacity': '1',
                        'visibility': 'visible',
                        'transform': 'scale(1)',
                        'background-color': 'red',
                        'z-index': '9999999',
                        'position': 'absolute'
                    }).addClass('wpfe-force-visible');
                    
                    // Add universal emergency button for deeply problematic themes
                    if ($('.wpfe-emergency-master-button').length === 0) {
                        $('<button type="button" class="wpfe-emergency-master-button">WP Frontend Editor - Emergency Edit Mode</button>')
                            .css({
                                'position': 'fixed',
                                'top': '10px',
                                'right': '10px',
                                'z-index': '99999999',
                                'background-color': 'red',
                                'color': 'white',
                                'padding': '10px 20px',
                                'font-size': '16px',
                                'border-radius': '5px',
                                'border': '2px solid white',
                                'box-shadow': '0 0 10px rgba(0,0,0,0.5)',
                                'cursor': 'pointer'
                            })
                            .appendTo('body')
                            .on('click', function() {
                                alert('Emergency Edit Mode Activated - Edit buttons have been made visible for all editable content.');
                                // Force all buttons to be extremely visible
                                $('.wpfe-edit-button').addClass('wpfe-emergency-visible')
                                    .css({
                                        'position': 'relative',
                                        'display': 'block',
                                        'opacity': '1',
                                        'visibility': 'visible',
                                        'transform': 'scale(1)',
                                        'margin': '10px auto',
                                        'width': '200px',
                                        'height': '40px',
                                        'background-color': 'red',
                                        'z-index': '9999999'
                                    });
                            });
                    }
                }
                
                // Add global helper for manual button addition
                window.wpfeAddButtonTo = function(selector) {
                    try {
                        var $element = $(selector);
                        if ($element.length) {
                            console.log('[WPFE] Manually adding button to:', selector);
                            
                            // Use fallback post ID if not defined
                            var pid = postId || (wpfe_data ? wpfe_data.post_id : 0);
                            
                            $element.addClass('wpfe-editable')
                                .attr('data-wpfe-field', 'manual_content')
                                .attr('data-wpfe-post-id', pid)
                                .attr('data-wpfe-identified-by', 'manual');
                            
                            try {
                                addEditButton($element, 'manual_content', pid);
                            } catch (btnErr) {
                                console.error('[WPFE] Error adding edit button in manual mode:', btnErr);
                            }
                        
                        $element.css({
                            'outline': '5px solid blue',
                            'background-color': 'rgba(0, 0, 255, 0.1)'
                        });
                        
                        return 'Button added to ' + selector;
                    } else {
                        return 'Element not found: ' + selector;
                    }
                    } catch (e) {
                        console.error('[WPFE] Error in wpfeAddButtonTo:', e);
                        return 'Error adding button: ' + e.message;
                    }
                };
            }, 2000);
            
            // Handle existing editable elements that might not have buttons
            $('.wpfe-editable').each(function() {
                var $element = $(this);
                if (!$element.attr('data-wpfe-has-button') || $element.find('.wpfe-edit-button').length === 0) {
                    var fieldName = $element.attr('data-wpfe-field');
                    var postId = $element.attr('data-wpfe-post-id') || wpfe_data.post_id;
                    
                    if (fieldName && postId) {
                        addEditButton($element, fieldName, postId);
                    }
                }
            });
            
            // In debug mode, add an emergency manual placement function to the global scope
            if (wpfe_data.debug_mode) {
                console.log('[WPFE] Adding emergency manual button function to window.wpfeAddButtonTo');
                
                window.wpfeAddButtonTo = function(selector) {
                    var $element = $(selector);
                    if ($element.length) {
                        console.log('[WPFE] Manually adding button to element:', selector);
                        
                        // Make sure it's marked as editable
                        $element.addClass('wpfe-editable')
                            .attr('data-wpfe-field', 'manual_content')
                            .attr('data-wpfe-post-id', wpfe_data.post_id)
                            .attr('data-wpfe-identified-by', 'manual');
                        
                        // Create edit button
                        addEditButton($element, 'manual_content', wpfe_data.post_id);
                        
                        // Style it prominently
                        $element.css({
                            'outline': '5px solid red',
                            'background-color': 'rgba(255, 0, 0, 0.2)'
                        });
                        
                        return 'Button added to ' + selector;
                    } else {
                        console.error('[WPFE] Element not found:', selector);
                        return 'Element not found: ' + selector;
                    }
                };
                
                // Immediately try to add buttons to common elements after a short delay
                setTimeout(function() {
                    console.log('[WPFE] Emergency auto-discovery of common elements');
                    
                    var commonElements = [
                        'h1:first',
                        'article:first',
                        'main:first',
                        '.content:first',
                        '.entry-content:first',
                        '.post:first',
                        '.site-content:first p:first',
                        '.post-content:first',
                        'main p:first',
                        '.container p:first'
                    ];
                    
                    for (var i = 0; i < commonElements.length; i++) {
                        var $element = $(commonElements[i]);
                        if ($element.length && !$element.hasClass('wpfe-editable')) {
                            window.wpfeAddButtonTo(commonElements[i]);
                        }
                    }
                }, 2000);
            }
            
            // Cache all edit buttons after initialization
            try {
                if (typeof WPFE.core.setEditButtons === 'function') {
                    WPFE.core.setEditButtons($('.wpfe-edit-button'));
                } else {
                    console.warn('[WPFE] core.setEditButtons is not a function - cannot cache edit buttons');
                }
            } catch (e) {
                console.error('[WPFE] Error caching edit buttons:', e);
            }
            
            // Add MutationObserver to watch for dynamic content changes more efficiently
            if (window.MutationObserver) {
                // Use a more optimized approach with debouncing
                var refreshDebounceTimer = null;
                var pendingMutations = [];
                
                var observer = new MutationObserver(function(mutations) {
                    // Store mutations for processing
                    pendingMutations = pendingMutations.concat(mutations);
                    
                    // Clear existing timer if there is one
                    if (refreshDebounceTimer) {
                        clearTimeout(refreshDebounceTimer);
                    }
                    
                    // Set new timer with a shorter delay (250ms instead of 500ms)
                    refreshDebounceTimer = setTimeout(function() {
                        // Process accumulated mutations
                        var contentChanged = false;
                        var editableElementsAffected = false;
                        
                        // Analyze mutations for relevant changes
                        pendingMutations.forEach(function(mutation) {
                            // Check for added nodes
                            if (mutation.addedNodes.length) {
                                contentChanged = true;
                                
                                // Check if added nodes might contain editable content
                                for (var i = 0; i < mutation.addedNodes.length; i++) {
                                    var node = mutation.addedNodes[i];
                                    if (node.nodeType === 1) { // Element node
                                        if ($(node).is(coreFields.map(function(f) { return f.selector; }).join(','))) {
                                            editableElementsAffected = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        });
                        
                        // Only refresh if content was actually added and might contain editable elements
                        if (contentChanged && editableElementsAffected) {
                            try {
                                WPFE.elements.refreshElements();
                                if (wpfe_data.debug_mode) {
                                    console.log('DOM changed - refreshing editable elements');
                                }
                            } catch (refreshErr) {
                                console.error('[WPFE] Error refreshing elements after DOM change:', refreshErr);
                            }
                        }
                        
                        // Reset pending mutations
                        pendingMutations = [];
                    }, 250);
                });
                
                // Start observing the main content area if possible
                var $mainContent = $('.content, .site-content, main, #content, #main, .entry-content').first();
                var targetNode = $mainContent.length ? $mainContent[0] : document.body;
                
                observer.observe(targetNode, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                    characterData: false
                });
            }
            
            // Trigger an event after initialization so other code can hook into it
            $(document).trigger('wpfe:elements_initialized');
            
            // Also initialize on window load to ensure all content is processed
            $(window).on('load', function() {
                // Refresh editable elements when all content is loaded
                setTimeout(function() {
                    try {
                        WPFE.elements.refreshElements();
                        console.log('[WPFE] Elements refreshed after window load event');
                    } catch (refreshErr) {
                        console.error('[WPFE] Error refreshing elements after window load:', refreshErr);
                    }
                }, 500);
            });
        },
        
        /**
         * Refresh editable elements
         * For when new content is loaded dynamically
         */
        refreshElements: function() {
            // Find all editable elements that don't have buttons
            $('.wpfe-editable').each(function() {
                var $element = $(this);
                if (!$element.attr('data-wpfe-has-button') || $element.find('.wpfe-edit-button').length === 0) {
                    var fieldName = $element.attr('data-wpfe-field');
                    var postId = $element.attr('data-wpfe-post-id') || wpfe_data.post_id;
                    
                    if (fieldName && postId) {
                        addEditButton($element, fieldName, postId);
                    }
                }
            });
            
            // Update the edit buttons cache
            try {
                if (typeof WPFE.core.setEditButtons === 'function') {
                    WPFE.core.setEditButtons($('.wpfe-edit-button'));
                } else {
                    console.warn('[WPFE] core.setEditButtons is not a function - cannot cache edit buttons');
                }
            } catch (e) {
                console.error('[WPFE] Error updating edit buttons cache:', e);
            }
            
            // Trigger an event for other components to hook into
            $(document).trigger('wpfe:elements_refreshed');
        },

        // Expose private functions that need to be accessible from other modules
        addEditButton: addEditButton,
        optimizeButtonPosition: optimizeButtonPosition
    };
})(jQuery);