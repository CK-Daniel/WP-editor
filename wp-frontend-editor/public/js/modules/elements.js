/**
 * WP Frontend Editor Elements Module
 * Handles discovery and management of editable elements
 */

var WPFE = WPFE || {};

WPFE.elements = (function($) {
    'use strict';
    
    // Mark this module as loaded
    WPFE.modulesReady.elements = true;
    if (WPFE.debug && WPFE.debug.modulesLoaded) {
        WPFE.debug.modulesLoaded.push('elements');
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
            if (wpfe_data.debug_mode) {
                console.warn('Cannot add edit button: Invalid element or field name', fieldName);
            }
            return;
        }
        
        try {
            // Set button position class based on settings
            var buttonPosition = wpfe_data.button_position || 'top-right';
            var positionClass = 'wpfe-button-' + buttonPosition;
            
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
            $element.find('.wpfe-edit-button').remove();
            
            // Add edit button with accessibility improvements
            var $button = $('<button type="button" class="wpfe-edit-button ' + positionClass + '" data-wpfe-field="' + fieldName + '" data-wpfe-post-id="' + postId + '" aria-label="' + (wpfe_data.i18n.edit_field || 'Edit') + ' ' + fieldName + '"></button>');
            $button.html(buttonContent);
            
            // Add the button to the element (always at the end for proper z-index)
            $element.append($button);
            
            // Ensure the element has position:relative if it's static
            if ($element.css('position') === 'static') {
                $element.css('position', 'relative');
            }
            
            // Optimize button position for visibility
            optimizeButtonPosition($element, $button);
            
            // Add hover effect if enabled
            if (wpfe_data.button_hover) {
                $button.addClass('wpfe-button-hover');
            }
            
            // Add a data attribute to track button status
            $element.attr('data-wpfe-has-button', 'true');
            
            // Ensure button is visible on hover with a small delay
            $element.on('mouseenter', function() {
                $button.css({
                    'opacity': '1',
                    'transform': 'scale(1) translateY(0)',
                    'visibility': 'visible'
                });
            });
            
            $element.on('mouseleave', function() {
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
                $(this).css({
                    'opacity': '1',
                    'transform': 'scale(1.05)',
                    'visibility': 'visible'
                });
            });
            
            $button.on('mouseleave', function() {
                if (!$element.is(':hover')) {
                    $(this).css({
                        'opacity': '0',
                        'transform': 'scale(0.9) translateY(5px)'
                    });
                }
            });
            
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
                        
                        // Make sure any static elements get relative positioning
                        if ($element.css('position') === 'static') {
                            $element.css('position', 'relative');
                        }
                        
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
                        } else {
                            // For elements that are already editable, make sure they have a working button
                            if (!$element.attr('data-wpfe-has-button') || $element.find('.wpfe-edit-button').length === 0) {
                                addEditButton($element, $element.attr('data-wpfe-field') || field.name, $element.attr('data-wpfe-post-id') || postId);
                            }
                            foundElements.push($element);
                        }
                    });
                }
                
                // If no elements found with primary selector, try content-based identification
                if (foundElements.length === 0 && pageContent && pageContent[field.name]) {
                    try {
                        var contentMatchedElements = identifyElementsByContent(field.name, pageContent[field.name], field.contentType);
                        if (wpfe_data.debug_mode && contentMatchedElements && contentMatchedElements.length) {
                            console.log('Identified ' + contentMatchedElements.length + ' elements for ' + field.name + ' using content matching');
                        }
                    } catch (e) {
                        console.error('Error while identifying elements by content for ' + field.name + ':', e);
                    }
                }
            });
            
            // Try to identify unlabeled elements that might be editable
            identifyPotentialEditableElements();
            
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
            
            // Cache all edit buttons after initialization
            WPFE.core.setEditButtons($('.wpfe-edit-button'));
            
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
                            WPFE.elements.refreshElements();
                            if (wpfe_data.debug_mode) {
                                console.log('DOM changed - refreshing editable elements');
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
                    WPFE.elements.refreshElements();
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
            WPFE.core.setEditButtons($('.wpfe-edit-button'));
            
            // Trigger an event for other components to hook into
            $(document).trigger('wpfe:elements_refreshed');
        },

        // Expose private functions that need to be accessible from other modules
        addEditButton: addEditButton,
        optimizeButtonPosition: optimizeButtonPosition
    };
})(jQuery);