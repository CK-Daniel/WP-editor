/**
 * WP Frontend Editor Elements Module
 * Handles discovery and management of editable elements
 */

var WPFE = WPFE || {};

WPFE.elements = (function($) {
    'use strict';

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
            if (wpfe_data.debug_mode) {
                console.warn('Cannot add edit button: Invalid element or field name', fieldName);
            }
            return;
        }
        
        try {
            var buttonContent = '';
            var positionClass = 'wpfe-button-' + (wpfe_data.button_position || 'top-right');
            
            // Add edit button
            var $button = $('<button type="button" class="wpfe-edit-button ' + positionClass + '" data-wpfe-field="' + fieldName + '" data-wpfe-post-id="' + postId + '"></button>');
            $button.html('<span class="dashicons dashicons-edit"></span>');
            
            // Add the button to the element
            $element.append($button);
            
            // Optimize button position for visibility
            optimizeButtonPosition($element, $button);
            
            // Add hover effect if enabled
            if (wpfe_data.button_hover) {
                $button.addClass('wpfe-button-hover');
            }
        } catch (e) {
            if (wpfe_data.debug_mode) {
                console.error('Error adding edit button:', e);
            }
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
            // Check for editable elements with core WordPress fields
            var coreFields = [
                { 
                    name: 'post_title', 
                    selector: '.entry-title, .post-title, h1.title, h2.title, .page-title, header h1, article h1:first-child, .site-title h1, .wp-block-post-title',
                    contentType: 'heading',
                    priority: 'high'
                },
                { 
                    name: 'post_content', 
                    selector: '.entry-content, .post-content, .content, .page-content, article .content-area, .wp-block-post-content, .post-text, article .text', 
                    contentType: 'content',
                    priority: 'medium'
                },
                { 
                    name: 'post_excerpt', 
                    selector: '.entry-summary, .excerpt, .post-excerpt, .post-summary, .wp-block-post-excerpt, .summary',
                    contentType: 'excerpt',
                    priority: 'medium' 
                }
            ];
            
            // Get page content from server if available
            var pageContent = wpfe_data.page_content || {};
            
            // Process each core field
            $.each(coreFields, function(index, field) {
                // Primary selector match
                var elements = $(field.selector);
                var foundElements = [];
                
                // Process primary matches first
                if (elements.length) {
                    elements.each(function() {
                        var $element = $(this);
                        var postId = wpfe_data.post_id;
                        
                        // Don't apply to elements that already have the editable class
                        if (!$element.hasClass('wpfe-editable')) {
                            // Add editable class and data attributes
                            $element.addClass('wpfe-editable')
                                .attr('data-wpfe-field', field.name)
                                .attr('data-wpfe-post-id', postId)
                                .attr('data-wpfe-identified-by', 'primary-selector');
                            
                            // Create edit button
                            addEditButton($element, field.name, postId);
                            foundElements.push($element);
                        }
                    });
                }
                
                // If no elements found with primary selector, try content-based identification
                if (foundElements.length === 0 && pageContent[field.name]) {
                    identifyElementsByContent(field.name, pageContent[field.name], field.contentType);
                }
            });
            
            // Try to identify unlabeled elements that might be editable
            identifyPotentialEditableElements();
            
            // Cache all edit buttons after initialization
            WPFE.core.setEditButtons($('.wpfe-edit-button'));
            
            // Trigger an event after initialization so other code can hook into it
            $(document).trigger('wpfe:elements_initialized');
        },

        // Expose private functions that need to be accessible from other modules
        addEditButton: addEditButton,
        optimizeButtonPosition: optimizeButtonPosition
    };
})(jQuery);