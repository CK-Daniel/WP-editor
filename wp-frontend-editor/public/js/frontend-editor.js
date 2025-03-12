/**
 * WP Frontend Editor JavaScript
 */

(function($) {
    'use strict';

    // Main plugin object
    var wpfe = {
        sidebar: null,
        overlay: null,
        editButtons: [],
        activeField: null,
        activePostId: null,
        fields: {},
        isEditing: false,
        originalValues: {},
        templates: {},

        /**
         * Initialize the frontend editor.
         */
        init: function() {
            // Only initialize for users who can edit
            if (typeof wpfe_data === 'undefined') {
                return;
            }

            // Cache DOM elements
            this.sidebar = $('#wpfe-editor-sidebar');
            this.overlay = $('#wpfe-editor-overlay');
            
            // Load templates
            this.loadTemplates();
            
            // Initialize event listeners
            this.initEvents();
            
            // Initialize editable elements
            this.initEditableElements();
            
            // Initialize mobile-specific features
            this.initMobileFeatures();
            
            // Add highlight class if enabled in settings
            if (wpfe_data.highlight_editable) {
                $('body').addClass('wpfe-highlight-editable');
            }
            
            // Detect mobile device for better button visibility
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                $('body').addClass('wpfe-mobile-device');
            }
            
            // Apply custom width to sidebar if set
            if (wpfe_data.sidebar_width && parseInt(wpfe_data.sidebar_width) > 0) {
                this.sidebar.css('width', parseInt(wpfe_data.sidebar_width) + 'px');
            }
            
            // Handle window resize events
            var self = this;
            $(window).on('resize', this.throttle(function() {
                // Adjust sidebar position on window resize
                if (self.isEditing) {
                    if ($(window).width() < 768) {
                        self.sidebar.css({
                            'bottom': '0',
                            'right': '0',
                            'top': 'auto',
                            'height': '80%',
                            'width': '100%'
                        });
                    } else {
                        self.sidebar.css({
                            'top': '',
                            'right': '',
                            'bottom': '',
                            'height': '',
                            'width': ''
                        });
                    }
                }
            }, 250));
            
            if (wpfe_data.debug_mode) {
                console.log('WP Frontend Editor initialized', wpfe_data);
            }
        },

        /**
         * Load HTML templates for the editor.
         */
        loadTemplates: function() {
            this.templates = {
                field: $('#wpfe-editor-field-template').html(),
                text: $('#wpfe-editor-text-template').html(),
                textarea: $('#wpfe-editor-textarea-template').html(),
                wysiwyg: $('#wpfe-editor-wysiwyg-template').html(),
                image: $('#wpfe-editor-image-template').html(),
                gallery: $('#wpfe-editor-gallery-template').html(),
                galleryItem: $('#wpfe-editor-gallery-item-template').html(),
                taxonomy: $('#wpfe-editor-taxonomy-template').html(),
                taxonomyItem: $('#wpfe-editor-taxonomy-item-template').html()
            };
        },

        /**
         * Initialize editable elements.
         */
        initEditableElements: function() {
            var self = this;
            
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
                            self.addEditButton($element, field.name, postId);
                            foundElements.push($element);
                        }
                    });
                }
                
                // If no elements found with primary selector, try content-based identification
                if (foundElements.length === 0 && pageContent[field.name]) {
                    self.identifyElementsByContent(field.name, pageContent[field.name], field.contentType);
                }
            });
            
            // Try to identify unlabeled elements that might be editable
            this.identifyPotentialEditableElements();
            
            // Cache all edit buttons after initialization
            this.editButtons = $('.wpfe-edit-button');
            
            // Trigger an event after initialization so other code can hook into it
            $(document).trigger('wpfe:elements_initialized');
        },
        
        /**
         * Identify elements by matching their content
         * This is a secondary identification method for when selectors fail
         * 
         * @param {string} fieldName The field name
         * @param {string} content The content to match
         * @param {string} contentType The type of content (heading, content, excerpt)
         */
        identifyElementsByContent: function(fieldName, content, contentType) {
            var self = this;
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
                        var similarity = self.calculateContentSimilarity(normalizedElementText, normalizedContent);
                        
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
                this.addEditButton(bestMatch.element, fieldName, postId);
                
                if (wpfe_data.debug_mode) {
                    console.log('Identified element by content matching:', fieldName, bestMatch.score, bestMatch.element);
                }
            }
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
         * Identify additional elements that may be editable but weren't matched by selectors
         * This uses heuristics to find potential editable content
         */
        identifyPotentialEditableElements: function() {
            // Only do this if enabled in settings
            if (!wpfe_data.discover_fields) {
                return;
            }
            
            var self = this;
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
                    var fieldName = self.guessFieldName($element);
                    
                    // Make editable if we found a likely field type
                    if (fieldName) {
                        $element.addClass('wpfe-editable')
                            .attr('data-wpfe-field', fieldName)
                            .attr('data-wpfe-post-id', postId)
                            .attr('data-wpfe-identified-by', 'discovery')
                            .attr('data-wpfe-field-type', 'discovered');
                        
                        // Create edit button
                        self.addEditButton($element, fieldName, postId);
                        
                        if (wpfe_data.debug_mode) {
                            console.log('Discovered potential editable element:', fieldName, $element);
                        }
                    }
                }
            });
        },
        
        /**
         * Try to guess what type of field an element represents
         * 
         * @param {jQuery} $element The jQuery element to analyze
         * @return {string|null} The guessed field name or null if unknown
         */
        guessFieldName: function($element) {
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
        },
        
        /**
         * Add edit button to an element.
         * 
         * @param {jQuery} $element The element to add button to.
         * @param {string} fieldName The field name.
         * @param {number} postId The post ID.
         */
        addEditButton: function($element, fieldName, postId) {
            // Safety checks
            if (!$element || !$element.length || !fieldName) {
                if (wpfe_data.debug_mode) {
                    console.warn('Cannot add edit button: Invalid element or field name', fieldName);
                }
                return;
            }
            
            try {
                var self = this;
                var buttonContent = '';
                var positionClass = 'wpfe-button-' + (wpfe_data.button_position || 'top-right');
                
                // Remove any existing edit buttons in this element
                $element.find('.wpfe-edit-button').remove();
                
                // Prepare the element for button placement
                this.prepareElementForEditing($element);
                
                // Button content based on style
                if (wpfe_data.button_style === 'icon-text') {
                    buttonContent = '<span class="dashicons dashicons-edit" aria-hidden="true"></span><span class="wpfe-button-text">' + wpfe_data.i18n.edit + '</span>';
                } else if (wpfe_data.button_style === 'text-only') {
                    buttonContent = '<span class="wpfe-button-text">' + wpfe_data.i18n.edit + '</span>';
                } else {
                    buttonContent = '<span class="dashicons dashicons-edit" aria-hidden="true"></span><span class="screen-reader-text">' + wpfe_data.i18n.edit + '</span>';
                }
                
                // Get field label if available
                var fieldLabel = fieldName;
                if (this.fields && this.fields[fieldName] && this.fields[fieldName].label) {
                    fieldLabel = this.fields[fieldName].label;
                } else {
                    // Try to make the field name more readable
                    fieldLabel = fieldName.replace(/^post_/, '')
                                         .replace(/^acf_/, '')
                                         .replace(/_/g, ' ')
                                         .replace(/-/g, ' ');
                    fieldLabel = fieldLabel.charAt(0).toUpperCase() + fieldLabel.slice(1);
                    
                    // Add "field type" indicator for discovered fields
                    if ($element.data('wpfe-identified-by') === 'discovery') {
                        fieldLabel += ' (' + wpfe_data.i18n.discovered_field + ')';
                    }
                }
                
                // Create button element with tooltip
                var $button = $('<button>')
                    .addClass('wpfe-edit-button ' + positionClass)
                    .attr('data-wpfe-field', fieldName)
                    .attr('data-wpfe-post-id', postId)
                    .attr('data-wpfe-field-label', fieldLabel)
                    .attr('aria-label', wpfe_data.i18n.edit + ' ' + fieldLabel)
                    .attr('title', wpfe_data.i18n.edit + ' ' + fieldLabel)
                    .html(buttonContent);
                
                // Add button to the element
                $element.append($button);
                
                // Verify the button was actually added to the DOM
                if (!$element.find('.wpfe-edit-button').length) {
                    if (wpfe_data.debug_mode) {
                        console.warn('Edit button could not be appended to element', $element);
                    }
                    return;
                }
                
                // Handle button positioning based on element characteristics
                this.optimizeButtonPosition($element, $button);
                
                // Add hover event to improve button visibility
                $element.off('mouseenter.wpfe mouseleave.wpfe').on('mouseenter.wpfe', function() {
                    $(this).addClass('wpfe-element-hover');
                    
                    // Make sure button is fully visible when element is hovered
                    if (!$(this).hasClass('wpfe-editable-active')) {
                        var $btn = $(this).find('.wpfe-edit-button');
                        if ($btn.length) {
                            $btn.addClass('wpfe-button-hover');
                            
                            // Check if button is partially outside viewport
                            self.ensureButtonVisibility($btn);
                        }
                    }
                }).on('mouseleave.wpfe', function() {
                    $(this).removeClass('wpfe-element-hover');
                    $(this).find('.wpfe-edit-button').removeClass('wpfe-button-hover');
                });
                
                // Run a detection check if button might be hidden by theme CSS
                setTimeout(function() {
                    if ($element && $element.length && $button && $button.length) {
                        self.verifyButtonVisibility($element, $button);
                    }
                }, 500);
            } catch (e) {
                if (wpfe_data.debug_mode) {
                    console.error('Error adding edit button:', e);
                }
            }
        },
        
        /**
         * Prepare an element for editing by setting necessary styles and properties
         * 
         * @param {jQuery} $element The element to prepare
         */
        prepareElementForEditing: function($element) {
            // Make sure the element has position relative for proper button positioning
            var position = $element.css('position');
            if (position === 'static') {
                $element.css('position', 'relative');
            }
            
            // Add outline to indicate editability (if not already styled by theme)
            if ($element.css('outline') === 'none' || $element.css('outline') === '') {
                $element.css('outline', '1px dashed transparent');
            }
            
            // Ensure the element has a minimum height for button placement
            if ($element.height() < 30 && !$element.is('img')) {
                $element.css('min-height', '30px');
            }
            
            // Set a higher z-index for proper layer ordering
            var zIndex = parseInt($element.css('z-index'), 10);
            if (isNaN(zIndex) || zIndex < 1) {
                $element.css('z-index', '1');
            }
            
            // Ensure element has proper tabindex for keyboard accessibility
            if (!$element.attr('tabindex')) {
                $element.attr('tabindex', '0');
            }
            
            // Add accessibility attributes
            $element.attr('role', 'region')
                   .attr('aria-label', wpfe_data.i18n.edit + ' ' + ($element.data('wpfe-field-label') || $element.data('wpfe-field')));
        },
        
        /**
         * Optimize button position based on element characteristics
         * 
         * @param {jQuery} $element The editable element
         * @param {jQuery} $button The edit button
         */
        optimizeButtonPosition: function($element, $button) {
            // Safety checks
            if (!$element || !$element.length || !$button || !$button.length) {
                return;
            }
            
            try {
                var positionClass = '';
                var buttonClass = $button.attr('class');
                
                if (buttonClass) {
                    var match = buttonClass.match(/wpfe-button-([\w-]+)/);
                    positionClass = match ? match[0] : '';
                }
                
                // Element size-based adjustments
                var elementWidth = $element.outerWidth() || 0;
                var elementHeight = $element.outerHeight() || 0;
                
                // For images, always place button in center
                if ($element.is('img') || ($element.find('img').length === 1 && $element.text().trim().length < 20)) {
                    $button.addClass('wpfe-button-overlay');
                    $element.addClass('wpfe-image-editable');
                    return;
                }
                
                // For very small elements, position button outside
                if (elementWidth < 80 || elementHeight < 40) {
                    $button.addClass('wpfe-button-external');
                    
                    if (positionClass.indexOf('right') !== -1) {
                        $button.css('right', '-30px');
                    } else {
                        $button.css('left', '-30px');
                    }
                    
                    // If element is at the edge of its container, adjust button to be visible
                    var elementOffset = $element.offset() || { left: 0, top: 0 };
                    var windowWidth = $(window).width();
                    
                    if (elementOffset.left < 40) {
                        // Too close to left edge
                        $button.css({
                            'left': '0',
                            'right': 'auto'
                        });
                    } else if (windowWidth - (elementOffset.left + elementWidth) < 40) {
                        // Too close to right edge
                        $button.css({
                            'right': '0',
                            'left': 'auto'
                        });
                    }
                }
                
                // For larger elements, optimize based on content density
                else {
                    // Check if element has a lot of text content (dense)
                    var textLength = $element.text().trim().length;
                    var contentDensity = elementWidth * elementHeight > 0 ? 
                                         textLength / (elementWidth * elementHeight) : 0;
                    
                    // For dense content, make button more prominent
                    if (contentDensity > 0.01) {
                        $button.addClass('wpfe-button-prominent');
                    }
                    
                    // For large, sparse elements (like large images or headings)
                    if (contentDensity < 0.005 && (elementWidth > 300 || elementHeight > 200)) {
                        $button.addClass('wpfe-button-large');
                    }
                }
                
                // For mobile devices, make buttons larger and more visible
                if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                    $button.addClass('wpfe-button-mobile');
                }
            } catch (e) {
                if (wpfe_data.debug_mode) {
                    console.warn('Error optimizing button position:', e);
                }
            }
        },
        
        /**
         * Verify that a button is actually visible and not hidden by theme CSS
         * If hidden, try alternative positioning
         * 
         * @param {jQuery} $element The editable element
         * @param {jQuery} $button The edit button
         */
        verifyButtonVisibility: function($element, $button) {
            // Safety checks
            if (!$element || !$element.length || !$button || !$button.length) {
                return;
            }
            
            try {
                // Skip if debugging is off
                if (!wpfe_data.debug_mode) {
                    return;
                }
                
                // Check if button is visible (has width and height)
                var buttonWidth = $button.outerWidth();
                var buttonHeight = $button.outerHeight();
                
                if (buttonWidth === 0 || buttonHeight === 0 || 
                    $button.css('display') === 'none' || 
                    $button.css('visibility') === 'hidden') {
                    
                    // Button is hidden, try alternative placement
                    console.log('Edit button visibility issue detected for', $element);
                    
                    // Check if element has valid data
                    var fieldName = $element.data('wpfe-field');
                    var postId = $element.data('wpfe-post-id');
                    
                    if (!fieldName || !postId) {
                        return;
                    }
                    
                    // Remove existing button
                    $button.remove();
                    
                    // Create a new button with different placement strategy
                    var newButton = $('<button>')
                        .addClass('wpfe-edit-button wpfe-button-alternative')
                        .attr('data-wpfe-field', fieldName)
                        .attr('data-wpfe-post-id', postId)
                        .attr('aria-label', wpfe_data.i18n.edit)
                        .attr('title', wpfe_data.i18n.edit)
                        .html('<span class="dashicons dashicons-edit"></span>');
                    
                    // Try absolute positioning at the top-right of the viewport
                    $('body').append(newButton);
                    
                    // Position relative to the element (with error handling)
                    var elementOffset = $element.offset() || { top: 0, left: 0 };
                    newButton.css({
                        'position': 'absolute',
                        'top': Math.max(elementOffset.top, 10) + 'px',
                        'right': '10px',
                        'z-index': '999999'
                    });
                    
                    // Store reference to the original element
                    newButton.data('wpfe-target-element', $element);
                    
                    // Add click handler
                    var self = this;
                    newButton.on('click', function(e) {
                        e.preventDefault();
                        var targetElement = $(this).data('wpfe-target-element');
                        
                        if (!targetElement || !targetElement.length) {
                            return;
                        }
                        
                        var fieldName = targetElement.data('wpfe-field');
                        var postId = targetElement.data('wpfe-post-id');
                        
                        if (fieldName && postId) {
                            self.openEditor(fieldName, postId, $(this));
                        }
                    });
                }
            } catch (e) {
                if (wpfe_data.debug_mode) {
                    console.warn('Error verifying button visibility:', e);
                }
            }
        },
        
        /**
         * Ensure button is visible within viewport when element is hovered
         * 
         * @param {jQuery} $button The button to check
         */
        ensureButtonVisibility: function($button) {
            // Safety check to prevent errors
            if (!$button || !$button.length || !$button[0]) {
                return;
            }
            
            try {
                // Check if button is partially out of viewport
                var buttonRect = $button[0].getBoundingClientRect();
                var windowWidth = window.innerWidth || document.documentElement.clientWidth;
                var windowHeight = window.innerHeight || document.documentElement.clientHeight;
                
                var isPartiallyHidden = 
                    buttonRect.left < 0 ||
                    buttonRect.right > windowWidth ||
                    buttonRect.top < 0 ||
                    buttonRect.bottom > windowHeight;
                    
                if (isPartiallyHidden) {
                    // Adjust button position to ensure visibility
                    if (buttonRect.left < 0) {
                        $button.css('left', '0');
                        $button.css('right', 'auto');
                    }
                    
                    if (buttonRect.right > windowWidth) {
                        $button.css('right', '0');
                        $button.css('left', 'auto');
                    }
                    
                    if (buttonRect.top < 0) {
                        $button.css('top', '0');
                        $button.css('bottom', 'auto');
                    }
                    
                    if (buttonRect.bottom > windowHeight) {
                        $button.css('bottom', '0');
                        $button.css('top', 'auto');
                    }
                    
                    // Add a class to indicate adjustment was made
                    $button.addClass('wpfe-button-adjusted');
                }
            } catch (e) {
                // Log error in debug mode
                if (wpfe_data.debug_mode) {
                    console.warn('Error ensuring button visibility:', e);
                }
            }
        },

        /**
         * Throttle function to limit how often a function can be called
         * @param {Function} func The function to throttle
         * @param {number} limit The time limit in ms
         * @returns {Function} Throttled function
         */
        /**
         * Initialize keyboard shortcuts for the editor
         * This adds various keyboard shortcuts to improve usability
         */
        initKeyboardShortcuts: function() {
            var self = this;
            
            // Store keyboard shortcuts configuration
            this.keyboardShortcuts = [
                { key: 'Escape', action: 'close', description: 'Close the editor' },
                { key: 'Ctrl+Enter', action: 'save', description: 'Save changes' },
                { key: 'Ctrl+/', action: 'shortcuts', description: 'Show keyboard shortcuts' },
                { key: 'Ctrl+`', action: 'minimize', description: 'Minimize/restore editor' },
                { key: 'Ctrl+1', action: 'tab-edit', description: 'Switch to Edit tab' },
                { key: 'Ctrl+2', action: 'tab-settings', description: 'Switch to Settings tab' },
                { key: 'Ctrl+3', action: 'tab-history', description: 'Switch to History tab' },
                { key: 'Ctrl+ArrowLeft', action: 'position-left', description: 'Move editor to left' },
                { key: 'Ctrl+ArrowRight', action: 'position-right', description: 'Move editor to right' },
                { key: 'Ctrl+ArrowDown', action: 'position-bottom', description: 'Move editor to bottom' }
            ];
            
            // Generate keyboard shortcuts help template
            var shortcutsHtml = '<div class="wpfe-keyboard-shortcuts">' +
                                '<h3>Keyboard Shortcuts</h3>' +
                                '<table class="wpfe-shortcuts-table">' +
                                '<thead><tr><th>Shortcut</th><th>Action</th></tr></thead>' +
                                '<tbody>';
            
            $.each(this.keyboardShortcuts, function(i, shortcut) {
                shortcutsHtml += '<tr><td><kbd>' + shortcut.key + '</kbd></td><td>' + 
                                 shortcut.description + '</td></tr>';
            });
            
            shortcutsHtml += '</tbody></table></div>';
            
            this.shortcutsTemplate = shortcutsHtml;
            
            // Add keyboard event listener
            $(document).on('keydown', function(e) {
                // Only handle keyboard shortcuts when editor is active
                if (!self.isEditing && !e.target.closest('.wpfe-editor-sidebar')) {
                    return;
                }
                
                // Skip if target is a form element (input, textarea, etc.) to avoid interference
                if ($(e.target).is('input, textarea, select, [contenteditable="true"]') && 
                    e.key !== 'Escape' && !(e.ctrlKey && e.key === '/')) {
                    return;
                }
                
                // Handle various key combinations
                if (e.key === 'Escape') {
                    // ESC to close editor
                    self.closeEditor();
                    e.preventDefault();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    // Ctrl/Cmd + Enter to save
                    self.saveChanges();
                    e.preventDefault();
                } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                    // Ctrl/Cmd + / to show shortcuts
                    self.showKeyboardShortcuts();
                    e.preventDefault();
                } else if ((e.ctrlKey || e.metaKey) && e.key === '`') {
                    // Ctrl/Cmd + ` to minimize/restore
                    if ($('body').hasClass('wpfe-editor-is-minimized')) {
                        self.restoreEditor();
                    } else {
                        self.minimizeEditor();
                    }
                    e.preventDefault();
                } else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
                    // Ctrl/Cmd + 1 to switch to edit tab
                    self.switchTab('edit');
                    e.preventDefault();
                } else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
                    // Ctrl/Cmd + 2 to switch to settings tab
                    self.switchTab('settings');
                    e.preventDefault();
                } else if ((e.ctrlKey || e.metaKey) && e.key === '3') {
                    // Ctrl/Cmd + 3 to switch to history tab
                    self.switchTab('history');
                    e.preventDefault();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
                    // Ctrl/Cmd + Left Arrow to position editor left
                    if ($(window).width() >= 768) {
                        self.changeSidebarPosition('left');
                        e.preventDefault();
                    }
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
                    // Ctrl/Cmd + Right Arrow to position editor right
                    if ($(window).width() >= 768) {
                        self.changeSidebarPosition('right');
                        e.preventDefault();
                    }
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
                    // Ctrl/Cmd + Down Arrow to position editor bottom
                    if ($(window).width() >= 768) {
                        self.changeSidebarPosition('bottom');
                        e.preventDefault();
                    }
                }
            });
        },
        
        /**
         * Show keyboard shortcuts help modal
         */
        showKeyboardShortcuts: function() {
            // Remove any existing shortcuts modal
            $('.wpfe-keyboard-shortcuts-modal').remove();
            
            // Create and show the modal
            var $modal = $('<div class="wpfe-keyboard-shortcuts-modal">' +
                          '<div class="wpfe-keyboard-shortcuts-modal-content">' +
                          '<button type="button" class="wpfe-keyboard-shortcuts-close">' +
                          '<span class="dashicons dashicons-no-alt"></span>' +
                          '</button>' +
                          this.shortcutsTemplate +
                          '</div></div>');
            
            $('body').append($modal);
            
            // Show with animation
            setTimeout(function() {
                $modal.addClass('is-active');
            }, 10);
            
            // Handle close button
            $modal.on('click', '.wpfe-keyboard-shortcuts-close', function() {
                $modal.removeClass('is-active');
                setTimeout(function() {
                    $modal.remove();
                }, 300);
            });
            
            // Close on background click
            $modal.on('click', function(e) {
                if ($(e.target).hasClass('wpfe-keyboard-shortcuts-modal')) {
                    $modal.removeClass('is-active');
                    setTimeout(function() {
                        $modal.remove();
                    }, 300);
                }
            });
            
            // Close on ESC
            $(document).one('keydown.shortcuts', function(e) {
                if (e.key === 'Escape') {
                    $modal.removeClass('is-active');
                    setTimeout(function() {
                        $modal.remove();
                    }, 300);
                    e.preventDefault();
                }
            });
        },
        
        /**
         * Initialize mobile-specific features
         */
        initMobileFeatures: function() {
            var self = this;
            
            // Only initialize mobile features if we're on a touch device
            if (!('ontouchstart' in window)) {
                return;
            }
            
            // Add touch class to body
            $('body').addClass('wpfe-touch-device');
            
            // Store initial touch positions
            var touchStartY = 0;
            var touchStartX = 0;
            var initialScrollTop = 0;
            var touchMoving = false;
            
            // Handle touch start
            this.sidebar.on('touchstart', function(e) {
                var touch = e.originalEvent.touches[0];
                touchStartY = touch.clientY;
                touchStartX = touch.clientX;
                initialScrollTop = self.sidebar.find('.wpfe-editor-sidebar-content').scrollTop();
                
                // Only handle touch gesture on the sidebar header for swipe down to close
                if ($(e.target).closest('.wpfe-editor-sidebar-header').length) {
                    touchMoving = true;
                }
            });
            
            // Handle touch move for swipe gestures
            this.sidebar.on('touchmove', function(e) {
                if (!touchMoving) return;
                
                var touch = e.originalEvent.touches[0];
                var deltaY = touchStartY - touch.clientY;
                var deltaX = touchStartX - touch.clientX;
                
                // If moving more horizontally than vertically, ignore
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    return;
                }
                
                // If swipe down and we're at top of content, begin closing
                if (deltaY < 0 && $(e.target).closest('.wpfe-editor-sidebar-header').length) {
                    // Calculate how far down to transform the sidebar
                    var translateY = Math.min(Math.abs(deltaY), 150);
                    self.sidebar.css('transform', 'translateY(' + translateY + 'px)');
                    e.preventDefault();
                }
            });
            
            // Handle touch end
            this.sidebar.on('touchend touchcancel', function(e) {
                if (!touchMoving) return;
                touchMoving = false;
                
                var touch = e.originalEvent.changedTouches[0];
                var deltaY = touchStartY - touch.clientY;
                
                // If swiped down significantly, close the sidebar
                if (deltaY < -100 && $(window).width() < 768) {
                    self.closeEditor();
                }
                
                // Reset the transform on the sidebar
                self.sidebar.css('transform', '');
            });
            
            // Enhance touch scrolling within editor content areas
            this.sidebar.find('.wpfe-editor-sidebar-content').on('touchmove', function(e) {
                e.stopPropagation();
            });
            
            // Prevent touch events on the media library from affecting the sidebar
            $(document).on('wp-media-library-open', function() {
                $('.media-modal').on('touchmove', function(e) {
                    e.stopPropagation();
                });
            });
            
            // Improve focus handling for touch devices
            this.sidebar.find('input, textarea, select').on('focus', function() {
                // Scroll element into view with some padding
                var $input = $(this);
                setTimeout(function() {
                    var inputTop = $input.offset().top;
                    var sidebarTop = self.sidebar.offset().top;
                    var relativeTop = inputTop - sidebarTop;
                    
                    self.sidebar.find('.wpfe-editor-sidebar-content').animate({
                        scrollTop: relativeTop - 80
                    }, 200);
                }, 300);
            });
        },
        
        /**
         * Throttle a function call to run at most once per specified period
         * @param {Function} func The function to throttle
         * @param {number} limit The time limit in ms
         * @returns {Function} Throttled function
         */
        throttle: function(func, limit) {
            var lastFunc;
            var lastRan;
            return function() {
                var context = this;
                var args = arguments;
                if (!lastRan) {
                    func.apply(context, args);
                    lastRan = Date.now();
                } else {
                    clearTimeout(lastFunc);
                    lastFunc = setTimeout(function() {
                        if ((Date.now() - lastRan) >= limit) {
                            func.apply(context, args);
                            lastRan = Date.now();
                        }
                    }, limit - (Date.now() - lastRan));
                }
            };
        },
        
        /**
         * Build hierarchical taxonomy terms HTML
         * 
         * @param {Object} termsByParent Terms organized by parent ID
         * @param {number} parentId The current parent ID to process
         * @param {number} level The indentation level
         * @param {Array} selectedValues Array of selected term IDs
         * @param {string} taxonomy The taxonomy name
         * @returns {string} HTML for the hierarchical terms
         */
        buildHierarchicalTermsHtml: function(termsByParent, parentId, level, selectedValues, taxonomy) {
            var html = '';
            var self = this;
            var indent = level * 20; // 20px indent per level
            
            // If no terms for this parent, return empty string
            if (!termsByParent[parentId]) {
                return html;
            }
            
            // Process terms for this parent
            termsByParent[parentId].forEach(function(term) {
                var checked = selectedValues.indexOf(term.value) !== -1 ? 'checked' : '';
                
                // Add this term
                html += self.templates.taxonomyItem
                    .replace(/{indent}/g, indent)
                    .replace(/{input_type}/g, 'checkbox')
                    .replace(/{taxonomy}/g, taxonomy)
                    .replace(/{term_id}/g, term.value)
                    .replace(/{checked}/g, checked)
                    .replace(/{term_name}/g, term.label)
                    .replace(/{term_count}/g, term.count || 0);
                
                // Process children if any
                if (termsByParent[term.value]) {
                    html += self.buildHierarchicalTermsHtml(termsByParent, term.value, level + 1, selectedValues, taxonomy);
                }
            });
            
            return html;
        },
        
        /**
         * Initialize event listeners.
         */
        initEvents: function() {
            var self = this;

            // Edit button click
            $(document).on('click', '.wpfe-edit-button', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var $button = $(this);
                var fieldName = $button.data('wpfe-field');
                var postId = $button.data('wpfe-post-id');
                
                self.openEditor(fieldName, postId, $button);
            });

            // Close sidebar
            this.sidebar.find('.wpfe-editor-sidebar-close').on('click', function() {
                self.closeEditor();
            });
            
            // Minimize sidebar
            this.sidebar.find('.wpfe-editor-sidebar-minimize').on('click', function() {
                self.minimizeEditor();
            });
            
            // Restore minimized sidebar
            $(document).on('click', '.wpfe-editor-restore', function() {
                self.restoreEditor();
            });
            
            // Tab switching
            this.sidebar.find('.wpfe-editor-tab').on('click', function() {
                var tabId = $(this).data('tab');
                self.switchTab(tabId);
            });
            
            // Settings panel events
            this.sidebar.find('input[name="wpfe-live-preview"]').on('change', function() {
                wpfe_data.live_preview = $(this).prop('checked');
            });
            
            this.sidebar.find('input[name="wpfe-expand-interface"]').on('change', function() {
                if ($(this).prop('checked')) {
                    self.sidebar.addClass('expanded');
                } else {
                    self.sidebar.removeClass('expanded');
                }
            });
            
            this.sidebar.find('select[name="wpfe-sidebar-position"]').on('change', function() {
                var position = $(this).val();
                self.changeSidebarPosition(position);
            });
            
            // Click on overlay
            this.overlay.on('click', function() {
                self.closeEditor();
            });

            // Save changes
            this.sidebar.find('.wpfe-editor-sidebar-save').on('click', function() {
                self.saveChanges();
            });

            // Cancel changes
            this.sidebar.find('.wpfe-editor-sidebar-cancel').on('click', function() {
                self.closeEditor();
            });
            
            // Edit in admin backend
            this.sidebar.find('.wpfe-editor-edit-backend').on('click', function(e) {
                e.preventDefault();
                var adminUrl = wpfe_data.admin_url + 'post.php?post=' + self.activePostId + '&action=edit';
                window.open(adminUrl, '_blank');
            });
            
            // Show keyboard shortcuts
            this.sidebar.find('.wpfe-editor-keyboard-shortcuts').on('click', function(e) {
                e.preventDefault();
                self.showKeyboardShortcuts();
            });

            // Image field events
            $(document).on('click', '.wpfe-editor-image-select, .wpfe-featured-image-select', function(e) {
                e.preventDefault();
                var $field = $(this).closest('.wpfe-editor-field');
                var fieldName = $field.data('field-name');
                
                self.openMediaLibrary(fieldName);
            });
            
            $(document).on('click', '.wpfe-editor-image-remove, .wpfe-featured-image-remove', function(e) {
                e.preventDefault();
                var $field = $(this).closest('.wpfe-editor-field');
                var fieldName = $field.data('field-name');
                
                self.removeImage(fieldName);
            });

            // Initialize and handle keyboard shortcuts
            this.initKeyboardShortcuts();
            
            // Handle basic keyboard events (for backward compatibility)
            $(document).on('keydown', function(e) {
                // Escape key
                if (e.keyCode === 27 && self.isEditing) {
                    self.closeEditor();
                }
                
                // Ctrl+Enter or Cmd+Enter to save
                if ((e.ctrlKey || e.metaKey) && e.keyCode === 13 && self.isEditing) {
                    self.saveChanges();
                }
                
                // Ctrl+S to save (prevent default browser save dialog)
                if ((e.ctrlKey || e.metaKey) && e.keyCode === 83 && self.isEditing) {
                    e.preventDefault();
                    self.saveChanges();
                }
            });

            // Support for inline editing if enabled
            if (wpfe_data.enable_inline) {
                $(document).on('click', '.wpfe-editable', function(e) {
                    if (self.isEditing || $(e.target).hasClass('wpfe-edit-button') || $(e.target).closest('.wpfe-edit-button').length) {
                        return;
                    }
                    
                    var $element = $(this);
                    var fieldName = $element.data('wpfe-field');
                    var postId = $element.data('wpfe-post-id');
                    
                    if (fieldName && postId) {
                        self.openEditor(fieldName, postId, $element.find('.wpfe-edit-button'));
                    }
                });
            }
            
            // Track field edit history
            $(document).on('change input', '.wpfe-editor-field input, .wpfe-editor-field textarea, .wpfe-editor-field select', this.throttle(function() {
                if (self.isEditing) {
                    self.trackFieldEdit($(this).attr('name'));
                }
            }, 1000));
        },
        
        /**
         * Switch between sidebar tabs
         * 
         * @param {string} tabId The tab ID to switch to
         */
        switchTab: function(tabId) {
            // Update tab buttons
            this.sidebar.find('.wpfe-editor-tab').removeClass('active');
            this.sidebar.find('.wpfe-editor-tab[data-tab="' + tabId + '"]').addClass('active');
            
            // Update tab content
            this.sidebar.find('.wpfe-editor-tab-content').removeClass('active');
            this.sidebar.find('.wpfe-editor-tab-content[data-tab-content="' + tabId + '"]').addClass('active');
        },
        
        /**
         * Change sidebar position (left, right, bottom)
         * 
         * @param {string} position The new position (left, right, bottom)
         */
        changeSidebarPosition: function(position) {
            // Remove all position classes
            this.sidebar.removeClass('position-left position-right position-bottom');
            
            // Add appropriate position class
            if (position === 'left') {
                this.sidebar.addClass('position-left');
            } else if (position === 'bottom') {
                this.sidebar.addClass('position-bottom');
            }
            
            // Store preference in localStorage for future sessions
            if (window.localStorage) {
                localStorage.setItem('wpfe_sidebar_position', position);
            }
        },
        
        /**
         * Track field edits for history
         * 
         * @param {string} fieldName The name of the edited field
         */
        trackFieldEdit: function(fieldName) {
            if (!fieldName) return;
            
            // Get history list
            var $historyList = this.sidebar.find('.wpfe-editor-history-list');
            var $historyNotice = this.sidebar.find('.wpfe-editor-history-notice');
            
            // Hide the notice since we have history items
            $historyNotice.hide();
            
            // Add history item if not already tracking this edit
            var timestamp = new Date().toLocaleTimeString();
            var fieldLabel = this.getFieldLabel(fieldName);
            
            // Check if we already have a history item for this field
            var $existingItem = $historyList.find('[data-field="' + fieldName + '"]');
            
            if ($existingItem.length) {
                // Update existing item with new timestamp
                $existingItem.find('.wpfe-editor-history-time').text(timestamp);
            } else {
                // Add new history item
                var historyHtml = '<li class="wpfe-editor-history-item" data-field="' + fieldName + '">' +
                                 '<div class="wpfe-editor-history-field">' + fieldLabel + '</div>' +
                                 '<div class="wpfe-editor-history-time">' + timestamp + '</div>' +
                                 '</li>';
                $historyList.prepend(historyHtml);
            }
        },
        
        /**
         * Get human-readable field label
         * 
         * @param {string} fieldName The field name
         * @return {string} The formatted field label
         */
        getFieldLabel: function(fieldName) {
            // Try to get field label from data
            if (this.fields && this.fields[fieldName] && this.fields[fieldName].label) {
                return this.fields[fieldName].label;
            }
            
            // Format the field name as a readable label
            return fieldName.replace(/^post_/, '')
                .replace(/^acf_/, '')
                .replace(/_/g, ' ')
                .replace(/-/g, ' ')
                .replace(/\b\w/g, function(l) { return l.toUpperCase(); });
        },
        
        /**
         * Minimize the editor sidebar
         */
        minimizeEditor: function() {
            // Hide sidebar but don't fully close it
            this.sidebar.removeClass('is-active');
            
            // Show minimized indicator
            var $minimized = $('#wpfe-editor-minimized');
            var fieldName = this.activeField ? this.getFieldLabel(this.activeField) : 'Editor';
            
            $minimized.find('.wpfe-editor-minimized-title').text('Editing: ' + fieldName);
            $minimized.show();
            
            // Add minimized state
            $('body').addClass('wpfe-editor-is-minimized');
        },
        
        /**
         * Restore minimized editor
         */
        restoreEditor: function() {
            // Hide minimized indicator
            $('#wpfe-editor-minimized').hide();
            
            // Show sidebar again
            this.sidebar.addClass('is-active');
            
            // Remove minimized state
            $('body').removeClass('wpfe-editor-is-minimized');
        },
        
        /**
         * Live preview content changes
         * 
         * @param {string} fieldName The field name
         * @param {string} content The new content
         */
        previewContentChange: function(fieldName, content) {
            // Only preview if live preview is enabled
            if (!wpfe_data.live_preview) {
                return;
            }
            
            // Find the element that contains this field and update it
            var $element = $('[data-wpfe-field="' + fieldName + '"]');
            
            if (!$element.length) {
                return;
            }
            
            if (fieldName === 'post_title') {
                // For title, preserve any existing HTML elements like the edit button
                var $button = $element.find('.wpfe-edit-button');
                $element.html(content);
                if ($button.length) {
                    $element.append($button);
                }
            } else if (fieldName === 'post_content' || fieldName.indexOf('acf_wysiwyg') === 0) {
                // For rich text content, preserve the edit button while replacing content
                var $button = $element.find('.wpfe-edit-button');
                $element.html(content);
                if ($button.length) {
                    $element.append($button);
                }
            } else {
                // For regular fields
                var $button = $element.find('.wpfe-edit-button');
                $element.text(content);
                if ($button.length) {
                    $element.append($button);
                }
            }
            
            // Show a visual indication of preview update
            $element.addClass('wpfe-preview-updated');
            setTimeout(function() {
                $element.removeClass('wpfe-preview-updated');
            }, 500);
        },

        /**
         * Initialize ACF fields.
         * 
         * @param {Array} fields The ACF fields to initialize.
         */
        initAcfFields: function(fields) {
            var self = this;
            
            if (!fields || !fields.length) {
                return;
            }
            
            if (wpfe_data.debug_mode) {
                console.log('ACF Fields to initialize:', fields);
            }
            
            // Process each field
            $.each(fields, function(index, field) {
                // Skip fields without a valid selector or key
                if (!field.selector || !field.key) {
                    if (wpfe_data.debug_mode) {
                        console.log('Skipping field with missing selector or key:', field);
                    }
                    return true; // Continue to next field
                }
                
                try {
                    // Validate the selector to avoid jQuery errors
                    // This will throw an error if the selector is invalid
                    var $testSelector = $(document.createElement('div')).find(field.selector);
                    
                    // If we got here, the selector is valid
                    var $elements = $(field.selector);
                    
                    if (wpfe_data.debug_mode) {
                        console.log('Looking for elements with selector:', field.selector, 'Found:', $elements.length);
                    }
                    
                    if ($elements.length) {
                        $elements.each(function() {
                            var $element = $(this);
                            
                            // Don't apply to elements that already have the editable class
                            if (!$element.hasClass('wpfe-editable')) {
                                // Add editable class and data attributes
                                $element.addClass('wpfe-editable')
                                    .attr('data-wpfe-field', field.key)
                                    .attr('data-wpfe-post-id', field.post_id)
                                    .attr('data-wpfe-field-type', 'acf');
                                
                                // Create and add edit button
                                self.addEditButton($element, field.key, field.post_id);
                            }
                        });
                    }
                } catch (e) {
                    // Log error for invalid selector
                    if (wpfe_data.debug_mode) {
                        console.error('Invalid selector for field:', field.key, field.selector, e);
                    }
                }
            });
            
            // Update edit buttons cache
            this.editButtons = $('.wpfe-edit-button');
        },

        /**
         * Open the editor sidebar.
         * 
         * @param {string} fieldName The field name.
         * @param {number} postId The post ID.
         * @param {jQuery} $button The edit button.
         */
        openEditor: function(fieldName, postId, $button) {
            var self = this;
            
            // Set active field
            this.activeField = fieldName;
            this.activePostId = postId;
            this.isEditing = true;
            
            // Store the active element for highlighting
            this.activeElement = $button ? $button.closest('.wpfe-editable') : null;
            
            // Apply an enhanced highlight to the active element
            if (this.activeElement && this.activeElement.length) {
                // Remove highlight from any previously active elements
                $('.wpfe-editable-active').removeClass('wpfe-editable-active');
                
                // Add active class to current element
                this.activeElement.addClass('wpfe-editable-active');
                
                // Scroll element into view if needed
                if (typeof this.activeElement[0].scrollIntoView === 'function') {
                    var elementTop = this.activeElement.offset().top;
                    var viewportTop = $(window).scrollTop();
                    var viewportBottom = viewportTop + $(window).height();
                    
                    // Only scroll if the element is not fully visible
                    if (elementTop < viewportTop || elementTop > viewportBottom - 100) {
                        this.activeElement[0].scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }
                }
            }
            
            // Show loading state
            this.sidebar.find('.wpfe-editor-sidebar-fields').empty();
            this.sidebar.find('.wpfe-editor-sidebar-loading').show();
            this.sidebar.find('.wpfe-editor-message').empty().removeClass('success error');
            
            // Set field name in header
            var fieldLabel = fieldName;
            var fieldType = '';
            
            if ($button && $button.length) {
                // Try to get more metadata from the element
                var $parent = $button.closest('.wpfe-editable');
                if ($parent.length) {
                    if ($parent.data('wpfe-field-label')) {
                        fieldLabel = $parent.data('wpfe-field-label');
                    }
                    if ($parent.data('wpfe-field-type')) {
                        fieldType = $parent.data('wpfe-field-type');
                    }
                }
            }
            
            // Update sidebar header
            this.sidebar.find('.wpfe-editor-field-name').text(fieldLabel);
            
            if (fieldType) {
                this.sidebar.find('.wpfe-editor-field-type').text(fieldType).show();
            } else {
                this.sidebar.find('.wpfe-editor-field-type').hide();
            }
            
            // Show sidebar and overlay
            this.sidebar.show();
            this.overlay.show();
            
            // Add active class after a small delay to trigger animation
            setTimeout(function() {
                self.sidebar.addClass('is-active');
            }, 10);
            
            // Position sidebar for optimal user experience based on screen size
            if ($(window).width() < 768) {
                // Mobile layout - bottom sheet style
                this.sidebar.css({
                    'bottom': '0',
                    'right': '0',
                    'left': '0',
                    'top': 'auto',
                    'height': 'var(--wpfe-sidebar-height-mobile)',
                    'width': 'var(--wpfe-sidebar-width-mobile)',
                    'border-radius': '16px 16px 0 0'
                }).removeClass('position-left position-right').addClass('position-bottom');
            } else if ($(window).width() < 1024) {
                // Tablet layout - side panel with adjusted width
                var position = wpfe_data.sidebar_position || 'right';
                this.sidebar.css({
                    'top': '0',
                    'bottom': '0',
                    'width': 'var(--wpfe-sidebar-width-tablet)',
                    'height': '100%',
                    'border-radius': '0',
                    'left': position === 'left' ? '0' : 'auto',
                    'right': position === 'right' ? '0' : 'auto'
                }).removeClass('position-bottom').addClass('position-' + position);
            }
            
            // Fetch field data
            this.fetchField(fieldName, postId);
        },

        /**
         * Close the editor sidebar.
         */
        closeEditor: function() {
            var self = this;
            
            // Remove active class to trigger animation
            this.sidebar.removeClass('is-active');
            
            // Remove the active element highlighting
            $('.wpfe-editable-active').removeClass('wpfe-editable-active');
            
            // Hide sidebar and overlay after animation finishes
            setTimeout(function() {
                self.sidebar.hide();
                self.overlay.hide();
                
                // Clean up WP Editor if it was initialized
                if (typeof wp !== 'undefined' && wp.editor && wp.editor.remove) {
                    $('.wpfe-editor-wysiwyg').each(function() {
                        wp.editor.remove($(this).attr('id'));
                    });
                }
                
                self.isEditing = false;
                self.activeField = null;
                self.activePostId = null;
                self.activeElement = null;
                self.fields = {};
                self.originalValues = {};
                
                // Reset sidebar position for next use
                self.sidebar.css({
                    'top': '',
                    'right': '',
                    'bottom': '',
                    'height': '',
                    'width': ''
                });
            }, 300);
        },

        /**
         * Fetch field data from the server.
         * 
         * @param {string} fieldName The field name.
         * @param {number} postId The post ID.
         */
        fetchField: function(fieldName, postId) {
            var self = this;
            
            // Make AJAX request
            $.ajax({
                url: wpfe_data.ajax_url,
                method: 'GET',
                data: {
                    action: 'wpfe_get_fields',
                    nonce: wpfe_data.nonce,
                    post_id: postId,
                    fields: fieldName
                },
                success: function(response) {
                    if (response.success) {
                        self.fields = response.data;
                        self.renderFields();
                    } else {
                        self.showError(response.data.message || wpfe_data.i18n.error);
                    }
                },
                error: function() {
                    self.showError(wpfe_data.i18n.error);
                }
            });
        },

        /**
         * Render fields in the sidebar.
         */
        renderFields: function() {
            var self = this;
            var $fieldsContainer = this.sidebar.find('.wpfe-editor-sidebar-fields');
            
            // Hide loading
            this.sidebar.find('.wpfe-editor-sidebar-loading').hide();
            
            // Clear fields container
            $fieldsContainer.empty();
            
            // Store original values
            this.originalValues = {};
            
            // Set field source in header
            var fieldSource = this.getFieldSource(Object.keys(this.fields)[0]);
            this.sidebar.find('.wpfe-editor-field-source').text(fieldSource).show();
            
            // Render each field
            $.each(this.fields, function(fieldName, fieldData) {
                // Store original value
                self.originalValues[fieldName] = fieldData.value;
                
                // Render the field
                var $field = self.renderField(fieldName, fieldData);
                
                if ($field) {
                    $fieldsContainer.append($field);
                }
            });
            
            // Initialize WordPress native editors
            this.initWpEditors();
            
            // Initialize rich interactive field types
            this.initTaxonomyFields();
            this.initColorPickers();
            this.initDatePickers();
            this.initMediaSelectors();
        },

        /**
         * Determine the source of a field (WordPress core, ACF, etc.)
         * 
         * @param {string} fieldName The field name
         * @returns {string} The field source label
         */
        getFieldSource: function(fieldName) {
            if (fieldName.indexOf('post_') === 0) {
                return 'WordPress Core';
            } else if (fieldName.indexOf('acf_') === 0 || fieldName.indexOf('field_') === 0) {
                return 'ACF';
            } else if (fieldName.indexOf('meta_') === 0) {
                return 'Custom Field';
            } else if (fieldName.indexOf('tax_') === 0) {
                return 'Taxonomy';
            } else {
                return 'Custom';
            }
        },

        /**
         * Render a single field.
         * 
         * @param {string} fieldName The field name.
         * @param {object} fieldData The field data.
         * @returns {jQuery} The field element.
         */
        renderField: function(fieldName, fieldData) {
            var fieldInput = '';
            var fieldSource = this.getFieldSource(fieldName);
            
            // Add field type class for styling
            var fieldTypeClass = 'wpfe-field-type-' + fieldData.type;
            
            // For WordPress core fields, use the native WordPress UI
            if (fieldSource === 'WordPress Core') {
                switch (fieldName) {
                    case 'post_title':
                        return this.renderWpTitleField(fieldName, fieldData);
                        
                    case 'post_content':
                        return this.renderWpContentField(fieldName, fieldData);
                        
                    case 'post_excerpt':
                        return this.renderWpExcerptField(fieldName, fieldData);
                        
                    case 'featured_image':
                        return this.renderWpFeaturedImageField(fieldName, fieldData);
                        
                    default:
                        // Default rendering for other core fields
                        return this.renderDefaultField(fieldName, fieldData);
                }
            }
            // For ACF fields, replicate the ACF UI
            else if (fieldSource === 'ACF') {
                return this.renderAcfField(fieldName, fieldData);
            }
            // For other field types, use our default rendering
            else {
                return this.renderDefaultField(fieldName, fieldData);
            }
        },
        
        /**
         * Render a WordPress title field with the native UI
         * 
         * @param {string} fieldName The field name
         * @param {object} fieldData The field data
         * @returns {jQuery} The field element
         */
        renderWpTitleField: function(fieldName, fieldData) {
            var html = '<div class="wpfe-editor-field wpfe-editor-wp-title-field" data-field-name="' + fieldName + '" data-field-type="wp-title">' +
                       '<label for="wpfe-field-' + fieldName + '" class="wpfe-editor-field-label">' + (fieldData.label || 'Title') + '</label>' +
                       '<div class="wpfe-editor-field-input">' +
                       '<input type="text" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + this.escapeHtml(fieldData.value || '') + '" ' +
                       'class="wpfe-editor-input wpfe-editor-title-input" placeholder="Enter title here">' +
                       '</div>' +
                       '</div>';
            
            return $(html);
        },
        
        /**
         * Render a WordPress content field with the native WP editor
         * 
         * @param {string} fieldName The field name
         * @param {object} fieldData The field data
         * @returns {jQuery} The field element
         */
        renderWpContentField: function(fieldName, fieldData) {
            var editorId = 'wpfe-field-' + fieldName;
            
            var html = '<div class="wpfe-editor-field wpfe-editor-wp-content-field" data-field-name="' + fieldName + '" data-field-type="wp-content">' +
                       '<label for="' + editorId + '" class="wpfe-editor-field-label">' + (fieldData.label || 'Content') + '</label>' +
                       '<div class="wpfe-editor-field-input">' +
                       '<textarea id="' + editorId + '" name="' + fieldName + '" class="wpfe-editor-wysiwyg">' + 
                       this.escapeHtml(fieldData.value || '') + '</textarea>' +
                       '</div>' +
                       '</div>';
            
            var $field = $(html);
            
            // Initialize the WordPress editor after the field is added to DOM
            var self = this;
            setTimeout(function() {
                if (typeof wp !== 'undefined' && wp.editor && wp.editor.initialize) {
                    wp.editor.initialize(editorId, {
                        tinymce: {
                            wpautop: true,
                            theme: 'modern',
                            skin: 'lightgray',
                            language: 'en',
                            formats: {
                                alignleft: [
                                    {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li', styles: {textAlign:'left'}},
                                    {selector: 'img,table,dl.wp-caption', classes: 'alignleft'}
                                ],
                                aligncenter: [
                                    {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li', styles: {textAlign:'center'}},
                                    {selector: 'img,table,dl.wp-caption', classes: 'aligncenter'}
                                ],
                                alignright: [
                                    {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li', styles: {textAlign:'right'}},
                                    {selector: 'img,table,dl.wp-caption', classes: 'alignright'}
                                ],
                                strikethrough: {inline: 'del'}
                            },
                            relative_urls: false,
                            remove_script_host: false,
                            convert_urls: false,
                            browser_spellcheck: true,
                            fix_list_elements: true,
                            entities: '38,amp,60,lt,62,gt',
                            entity_encoding: 'raw',
                            keep_styles: false,
                            paste_webkit_styles: 'font-weight font-style color',
                            preview_styles: 'font-family font-size font-weight font-style text-decoration text-transform',
                            tabfocus_elements: ':prev,:next',
                            plugins: 'charmap,hr,media,paste,tabfocus,textcolor,fullscreen,wordpress,wpeditimage,wpgallery,wplink,wpdialogs,wpview',
                            resize: 'vertical',
                            menubar: false,
                            indent: false,
                            toolbar1: 'bold,italic,strikethrough,bullist,numlist,blockquote,hr,alignleft,aligncenter,alignright,link,unlink,wp_more,spellchecker,fullscreen,wp_adv',
                            toolbar2: 'formatselect,underline,alignjustify,forecolor,pastetext,removeformat,charmap,outdent,indent,undo,redo,wp_help',
                            toolbar3: '',
                            toolbar4: '',
                            body_class: 'id post-type-post post-status-publish post-format-standard',
                            wpeditimage_disable_captions: false,
                            wpeditimage_html5_captions: true,
                            height: 300,
                            setup: function(editor) {
                                // Setup editor events
                                editor.on('change', function() {
                                    editor.save(); // Sync to textarea
                                    
                                    if (wpfe_data.live_preview) {
                                        self.previewContentChange(fieldName, editor.getContent());
                                    }
                                });
                            }
                        },
                        quicktags: {
                            buttons: 'strong,em,link,block,del,ins,img,ul,ol,li,code,more,close'
                        },
                        mediaButtons: true
                    });
                }
            }, 100);
            
            return $field;
        },
        
        /**
         * Render a WordPress excerpt field with native styling
         *
         * @param {string} fieldName The field name
         * @param {object} fieldData The field data
         * @returns {jQuery} The field element
         */
        renderWpExcerptField: function(fieldName, fieldData) {
            var html = '<div class="wpfe-editor-field wpfe-editor-wp-excerpt-field" data-field-name="' + fieldName + '" data-field-type="wp-excerpt">' +
                       '<label for="wpfe-field-' + fieldName + '" class="wpfe-editor-field-label">' + (fieldData.label || 'Excerpt') + '</label>' +
                       '<div class="wpfe-editor-field-input">' +
                       '<textarea id="wpfe-field-' + fieldName + '" name="' + fieldName + '" class="wpfe-editor-input wpfe-editor-excerpt">' + 
                       this.escapeHtml(fieldData.value || '') + '</textarea>' +
                       '<p class="wpfe-field-description">Excerpts are optional hand-crafted summaries of your content.</p>' +
                       '</div>' +
                       '</div>';
            
            return $(html);
        },
        
        /**
         * Render a WordPress featured image field with native UI
         *
         * @param {string} fieldName The field name
         * @param {object} fieldData The field data
         * @returns {jQuery} The field element
         */
        renderWpFeaturedImageField: function(fieldName, fieldData) {
            var hasImage = fieldData.value && fieldData.url;
            
            var html = '<div class="wpfe-editor-field wpfe-editor-wp-featured-image-field" data-field-name="' + fieldName + '" data-field-type="wp-featured-image">' +
                       '<label class="wpfe-editor-field-label">' + (fieldData.label || 'Featured Image') + '</label>' +
                       '<div class="wpfe-editor-field-input">' +
                       '<div class="wpfe-featured-image-container">';
            
            if (hasImage) {
                html += '<div class="wpfe-featured-image-preview">' +
                        '<img src="' + fieldData.url + '" alt="" class="wpfe-featured-image">' +
                        '</div>' +
                        '<div class="wpfe-featured-image-actions">' +
                        '<button type="button" class="wpfe-featured-image-remove button">Remove featured image</button>' +
                        '</div>';
            } else {
                html += '<div class="wpfe-featured-image-placeholder">' +
                        '<button type="button" class="wpfe-featured-image-select button">Set featured image</button>' +
                        '</div>';
            }
            
            html += '</div>' +
                    '<input type="hidden" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + (fieldData.value || '') + '">' +
                    '</div>' +
                    '</div>';
            
            var $field = $(html);
            
            // Add event handlers
            $field.find('.wpfe-featured-image-select').on('click', function() {
                self.openMediaLibrary(fieldName);
            });
            
            $field.find('.wpfe-featured-image-remove').on('click', function() {
                self.removeImage(fieldName);
                // Update the UI to show the placeholder
                $field.find('.wpfe-featured-image-preview, .wpfe-featured-image-actions').remove();
                $field.find('.wpfe-featured-image-container').html(
                    '<div class="wpfe-featured-image-placeholder">' +
                    '<button type="button" class="wpfe-featured-image-select button">Set featured image</button>' +
                    '</div>'
                );
                
                // Re-add event handler
                $field.find('.wpfe-featured-image-select').on('click', function() {
                    self.openMediaLibrary(fieldName);
                });
            });
            
            return $field;
        },
        
        /**
         * Render an ACF field using ACF-like interface
         *
         * @param {string} fieldName The field name
         * @param {object} fieldData The field data
         * @returns {jQuery} The field element
         */
        renderAcfField: function(fieldName, fieldData) {
            var self = this;
            var html = '';
            
            // Create a wrapper with ACF styling
            html = '<div class="wpfe-editor-field wpfe-editor-acf-field wpfe-acf-field-' + fieldData.type + '" ' + 
                  'data-field-name="' + fieldName + '" data-field-type="acf-' + fieldData.type + '">';
            
            // Field label in ACF style
            html += '<div class="wpfe-acf-field-label">' +
                   '<label for="wpfe-field-' + fieldName + '">' + (fieldData.label || fieldName) + '</label>';
            
            // Add required indicator if field is required
            if (fieldData.required) {
                html += '<span class="wpfe-acf-required">*</span>';
            }
            
            html += '</div>';
            
            // Field instructions if available
            if (fieldData.instructions) {
                html += '<div class="wpfe-acf-field-instructions">' + fieldData.instructions + '</div>';
            }
            
            // Start field input wrapper
            html += '<div class="wpfe-acf-field-input">';
            
            // Generate appropriate input based on ACF field type
            switch (fieldData.type) {
                case 'text':
                    html += '<input type="text" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + 
                           this.escapeHtml(fieldData.value || '') + '" class="wpfe-acf-text-input">';
                    break;
                    
                case 'textarea':
                    html += '<textarea id="wpfe-field-' + fieldName + '" name="' + fieldName + '" ' +
                            'class="wpfe-acf-textarea-input" rows="8">' + this.escapeHtml(fieldData.value || '') + '</textarea>';
                    break;
                    
                case 'wysiwyg':
                    html += '<div class="wpfe-acf-wysiwyg-wrap">' +
                            '<textarea id="wpfe-field-' + fieldName + '" name="' + fieldName + '" ' +
                            'class="wpfe-editor-wysiwyg">' + this.escapeHtml(fieldData.value || '') + '</textarea>' +
                            '</div>';
                    break;
                    
                case 'image':
                    var hasImage = fieldData.value && fieldData.url;
                    html += '<div class="wpfe-acf-image-wrap">';
                    
                    if (hasImage) {
                        html += '<div class="wpfe-acf-image-preview">' +
                                '<img src="' + fieldData.url + '" alt="" class="wpfe-acf-image">' +
                                '</div>';
                    } else {
                        html += '<div class="wpfe-acf-image-placeholder">' +
                                '<div class="wpfe-acf-image-placeholder-inner">' +
                                '<i class="acf-icon -picture"></i>' +
                                '</div>' +
                                '</div>';
                    }
                    
                    html += '<div class="wpfe-acf-image-actions">' +
                            '<a href="#" class="wpfe-acf-image-select acf-button">' + (hasImage ? 'Change Image' : 'Add Image') + '</a>';
                            
                    if (hasImage) {
                        html += '<a href="#" class="wpfe-acf-image-remove acf-button">Remove Image</a>';
                    }
                    
                    html += '</div>' +
                            '<input type="hidden" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + (fieldData.value || '') + '">' +
                            '</div>';
                    break;
                    
                case 'gallery':
                    var galleryItemsHtml = '';
                    var galleryValues = [];
                    var missingImageIds = [];
                    
                    // Process gallery values
                    if (Array.isArray(fieldData.value)) {
                        fieldData.value.forEach(function(item) {
                            var imageId, imageUrl;
                            
                            if (typeof item === 'object' && item !== null) {
                                imageId = item.id || item.ID || '';
                                imageUrl = item.url || item.sizes?.thumbnail?.url || '';
                            } else {
                                imageId = item;
                                imageUrl = '';
                            }
                            
                            if (imageId) {
                                galleryValues.push(imageId);
                                
                                if (imageUrl) {
                                    galleryItemsHtml += '<div class="wpfe-acf-gallery-item" data-id="' + imageId + '">' +
                                                       '<div class="wpfe-acf-gallery-item-inner">' +
                                                       '<img src="' + imageUrl + '" alt="">' +
                                                       '<div class="wpfe-acf-gallery-item-actions">' +
                                                       '<a href="#" class="wpfe-acf-gallery-item-remove" title="Remove Item">×</a>' +
                                                       '</div>' +
                                                       '</div>' +
                                                       '</div>';
                                } else {
                                    missingImageIds.push(imageId);
                                }
                            }
                        }, this);
                    }
                    
                    html += '<div class="wpfe-acf-gallery-wrap">' +
                            '<div class="wpfe-acf-gallery-main">' +
                            '<div class="wpfe-acf-gallery-attachments wpfe-sortable-gallery">' + galleryItemsHtml + '</div>' +
                            '<div class="wpfe-acf-gallery-actions">' +
                            '<a href="#" class="wpfe-acf-gallery-add acf-button">Add to gallery</a>' +
                            '</div>' +
                            '</div>' +
                            '<input type="hidden" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value=\'' + JSON.stringify(galleryValues) + '\'>' +
                            '</div>';
                    
                    // Store missing image IDs to fetch later
                    if (missingImageIds.length > 0) {
                        setTimeout(function() {
                            self.fetchGalleryImageData(fieldName, missingImageIds);
                        }, 100);
                    }
                    break;
                    
                case 'select':
                    var options = fieldData.options || [];
                    var isMultiple = fieldData.multiple || false;
                    
                    html += '<select id="wpfe-field-' + fieldName + '" name="' + fieldName + '" ' +
                            (isMultiple ? 'multiple="multiple"' : '') + ' class="wpfe-acf-select-input">';
                    
                    // Empty option for single selects
                    if (!isMultiple && !fieldData.required) {
                        html += '<option value="">- Select -</option>';
                    }
                    
                    options.forEach(function(option) {
                        var selected = '';
                        
                        if (isMultiple && Array.isArray(fieldData.value)) {
                            selected = fieldData.value.indexOf(option.value) !== -1 ? 'selected' : '';
                        } else {
                            selected = fieldData.value == option.value ? 'selected' : '';
                        }
                        
                        html += '<option value="' + option.value + '" ' + selected + '>' + option.label + '</option>';
                    });
                    
                    html += '</select>';
                    break;
                    
                case 'checkbox':
                    var options = fieldData.options || [];
                    var values = Array.isArray(fieldData.value) ? fieldData.value : [fieldData.value];
                    
                    html += '<div class="wpfe-acf-checkbox-wrap">';
                    
                    options.forEach(function(option) {
                        var checked = values.indexOf(option.value) !== -1 ? 'checked' : '';
                        
                        html += '<label class="wpfe-acf-checkbox-label">' +
                                '<input type="checkbox" name="' + fieldName + '[]" value="' + option.value + '" ' + checked + ' class="wpfe-acf-checkbox-input">' +
                                option.label +
                                '</label>';
                    });
                    
                    html += '<input type="hidden" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value=\'' + JSON.stringify(values) + '\'>';
                    html += '</div>';
                    break;
                    
                case 'radio':
                    var options = fieldData.options || [];
                    
                    html += '<div class="wpfe-acf-radio-wrap">';
                    
                    options.forEach(function(option) {
                        var checked = fieldData.value == option.value ? 'checked' : '';
                        
                        html += '<label class="wpfe-acf-radio-label">' +
                                '<input type="radio" name="' + fieldName + '_radio" value="' + option.value + '" ' + checked + ' class="wpfe-acf-radio-input">' +
                                option.label +
                                '</label>';
                    });
                    
                    html += '<input type="hidden" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + (fieldData.value || '') + '">';
                    html += '</div>';
                    break;
                    
                case 'true_false':
                    var checked = fieldData.value ? 'checked' : '';
                    
                    html += '<div class="wpfe-acf-true-false-wrap">' +
                            '<label class="wpfe-acf-true-false-label">' +
                            '<input type="checkbox" name="' + fieldName + '_checkbox" value="1" ' + checked + ' class="wpfe-acf-true-false-input">' +
                            (fieldData.ui_text || 'Yes') +
                            '</label>' +
                            '<input type="hidden" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + (fieldData.value ? '1' : '0') + '">' +
                            '</div>';
                    break;
                    
                case 'number':
                    html += '<input type="number" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + (fieldData.value || '') + '" ' +
                            'class="wpfe-acf-number-input" step="' + (fieldData.step || 'any') + '" ' +
                            (fieldData.min !== undefined ? 'min="' + fieldData.min + '"' : '') + ' ' +
                            (fieldData.max !== undefined ? 'max="' + fieldData.max + '"' : '') + '>';
                    break;
                    
                case 'color_picker':
                    html += '<div class="wpfe-acf-color-picker-wrap">' +
                            '<input type="text" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + (fieldData.value || '') + '" ' +
                            'class="wpfe-acf-color-picker">' +
                            '</div>';
                    break;
                
                case 'date_picker':
                    html += '<div class="wpfe-acf-date-picker-wrap">' +
                            '<input type="text" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + (fieldData.value || '') + '" ' +
                            'class="wpfe-acf-date-picker" placeholder="YYYY-MM-DD">' +
                            '</div>';
                    break;
                    
                default:
                    // Fallback for unsupported field types
                    html += '<p class="wpfe-acf-field-unsupported">' + (wpfe_data.i18n.unsupported_field || 'This field type is not fully supported yet.') + '</p>';
                    
                    // For text-like fields, still show a text input
                    if (['email', 'url', 'password', 'range'].indexOf(fieldData.type) !== -1) {
                        html += '<input type="text" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + 
                               this.escapeHtml(fieldData.value || '') + '" class="wpfe-acf-text-input">';
                    } else {
                        // Add a hidden input to store the value
                        html += '<input type="hidden" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + 
                               (typeof fieldData.value === 'object' ? JSON.stringify(fieldData.value) : (fieldData.value || '')) + '">';
                    }
                    break;
            }
            
            // Close field input wrapper and field container
            html += '</div></div>';
            
            var $field = $(html);
            
            // Add event handlers for ACF fields
            this.addAcfFieldEventHandlers($field, fieldName, fieldData);
            
            return $field;
        },
        
        /**
         * Add event handlers to ACF field elements
         * 
         * @param {jQuery} $field The field jQuery element
         * @param {string} fieldName The field name
         * @param {object} fieldData The field data
         */
        addAcfFieldEventHandlers: function($field, fieldName, fieldData) {
            var self = this;
            
            switch (fieldData.type) {
                case 'image':
                    $field.find('.wpfe-acf-image-select').on('click', function(e) {
                        e.preventDefault();
                        self.openMediaLibrary(fieldName);
                    });
                    
                    $field.find('.wpfe-acf-image-remove').on('click', function(e) {
                        e.preventDefault();
                        self.removeImage(fieldName);
                        
                        // Update the UI
                        var $wrap = $field.find('.wpfe-acf-image-wrap');
                        $wrap.find('.wpfe-acf-image-preview').remove();
                        $wrap.prepend('<div class="wpfe-acf-image-placeholder"><div class="wpfe-acf-image-placeholder-inner"><i class="acf-icon -picture"></i></div></div>');
                        
                        // Update button text
                        $wrap.find('.wpfe-acf-image-select').text('Add Image');
                        $wrap.find('.wpfe-acf-image-remove').remove();
                    });
                    break;
                    
                case 'gallery':
                    $field.find('.wpfe-acf-gallery-add').on('click', function(e) {
                        e.preventDefault();
                        self.openGalleryMedia(fieldName);
                    });
                    
                    $field.on('click', '.wpfe-acf-gallery-item-remove', function(e) {
                        e.preventDefault();
                        var $item = $(this).closest('.wpfe-acf-gallery-item');
                        $item.remove();
                        self.updateGalleryValues($field);
                    });
                    break;
                    
                case 'checkbox':
                    $field.find('.wpfe-acf-checkbox-input').on('change', function() {
                        var values = [];
                        $field.find('.wpfe-acf-checkbox-input:checked').each(function() {
                            values.push($(this).val());
                        });
                        $field.find('input[type="hidden"]').val(JSON.stringify(values));
                    });
                    break;
                    
                case 'radio':
                    $field.find('.wpfe-acf-radio-input').on('change', function() {
                        $field.find('input[type="hidden"]').val($(this).val());
                    });
                    break;
                    
                case 'true_false':
                    $field.find('.wpfe-acf-true-false-input').on('change', function() {
                        $field.find('input[type="hidden"]').val($(this).prop('checked') ? '1' : '0');
                    });
                    break;
            }
        },
        
        /**
         * Render a default field with basic UI
         *
         * @param {string} fieldName The field name
         * @param {object} fieldData The field data
         * @returns {jQuery} The field element
         */
        renderDefaultField: function(fieldName, fieldData) {
            var fieldInput = '';
            
            // Generate input HTML based on field type
            switch (fieldData.type) {
                case 'text':
                    fieldInput = '<input type="text" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + 
                                this.escapeHtml(fieldData.value || '') + '" class="wpfe-editor-input">';
                    break;
                    
                case 'textarea':
                    fieldInput = '<textarea id="wpfe-field-' + fieldName + '" name="' + fieldName + '" class="wpfe-editor-input">' + 
                                this.escapeHtml(fieldData.value || '') + '</textarea>';
                    break;
                    
                case 'wysiwyg':
                    fieldInput = '<div class="wpfe-editor-wysiwyg-container">' +
                                '<textarea id="wpfe-field-' + fieldName + '" name="' + fieldName + '" class="wpfe-editor-wysiwyg">' + 
                                this.escapeHtml(fieldData.value || '') + '</textarea>' +
                                '</div>';
                    break;
                    
                case 'image':
                    var hasImage = fieldData.value && fieldData.url;
                    fieldInput = '<div class="wpfe-editor-image-preview">' +
                                '<img src="' + (fieldData.url || '') + '" alt="" style="max-width: 100%; height: auto; display: ' + (hasImage ? 'block' : 'none') + ';">' +
                                '</div>' +
                                '<input type="hidden" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + (fieldData.value || '') + '" class="wpfe-editor-input">' +
                                '<div class="wpfe-editor-image-buttons">' +
                                '<button type="button" class="button wpfe-editor-image-select">' + (hasImage ? 'Change Image' : 'Select Image') + '</button> ' +
                                (hasImage ? '<button type="button" class="button wpfe-editor-image-remove">Remove Image</button>' : '') +
                                '</div>';
                    break;
                
                case 'gallery':
                    // Process gallery field (using existing implementation)
                    var galleryItemsHtml = '';
                    var galleryValues = [];
                    var missingImageIds = [];
                    
                    // Handle various formats of gallery data
                    if (Array.isArray(fieldData.value)) {
                        // Process array of image IDs or objects
                        fieldData.value.forEach(function(item) {
                            var imageId, imageUrl;
                            
                            // Different formats from ACF
                            if (typeof item === 'object' && item !== null) {
                                imageId = item.id || item.ID || '';
                                imageUrl = item.url || item.sizes?.thumbnail?.url || '';
                            } else {
                                imageId = item;
                                // We'll need to get the URL via AJAX later
                                imageUrl = '';
                            }
                            
                            if (imageId) {
                                galleryValues.push(imageId);
                                
                                // Add gallery item if we have the URL
                                if (imageUrl) {
                                    galleryItemsHtml += this.templates.galleryItem
                                        .replace(/{image_id}/g, imageId)
                                        .replace(/{image_url}/g, imageUrl);
                                } else {
                                    // Add to list of URLs to fetch
                                    missingImageIds.push(imageId);
                                }
                            }
                        }, this);
                    }
                    
                    // Generate gallery field HTML
                    fieldInput = '<div class="wpfe-editor-gallery-field">' +
                                '<div class="wpfe-gallery-preview wpfe-sortable-gallery">' + galleryItemsHtml + '</div>' +
                                '<input type="hidden" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value=\'' + JSON.stringify(galleryValues) + '\'>' +
                                '<div class="wpfe-gallery-buttons">' +
                                '<button type="button" class="button wpfe-gallery-add">Add Images</button>' +
                                '</div>' +
                                '</div>';
                        
                    // If we have missing image URLs, fetch them after rendering
                    if (missingImageIds.length > 0) {
                        // Use a setTimeout to ensure the field is rendered before making the AJAX call
                        setTimeout(function() {
                            this.fetchGalleryImageData(fieldName, missingImageIds);
                        }.bind(this), 100);
                    }
                    break;

                default:
                    // For unsupported field types
                    fieldInput = '<p class="wpfe-editor-field-unsupported">' + (wpfe_data.i18n.unsupported_field || 'This field type is not supported yet.') + '</p>';
                    
                    // Add a hidden input to store the value
                    fieldInput += '<input type="hidden" id="wpfe-field-' + fieldName + '" name="' + fieldName + '" value="' + 
                                 (typeof fieldData.value === 'object' ? JSON.stringify(fieldData.value) : this.escapeHtml(fieldData.value || '')) + '">';
                    break;
            }
            
            // Create field container
            var html = '<div class="wpfe-editor-field wpfe-editor-field-' + fieldData.type + '" data-field-name="' + fieldName + '" data-field-type="' + fieldData.type + '">' +
                      '<label for="wpfe-field-' + fieldName + '" class="wpfe-editor-field-label">' + (fieldData.label || fieldName) + '</label>' +
                      '<div class="wpfe-editor-field-input">' + fieldInput + '</div>' +
                      '</div>';
                
            return $(html);
        },
        
        /**
         * Initialize all WordPress native editors
         */
        initWpEditors: function() {
            // Regular TinyMCE editors are already initialized in renderWpContentField
            // This method is for other editor types that need initialization
            this.initWysiwygEditors();
        },
        
        /**
         * Initialize color pickers for ACF fields
         */
        initColorPickers: function() {
            if (window.jQuery.fn.wpColorPicker) {
                $('.wpfe-acf-color-picker').wpColorPicker({
                    change: function(event, ui) {
                        // Update the hidden input value
                        $(this).val(ui.color.toString()).trigger('change');
                    }
                });
            }
        },
        
        /**
         * Initialize date pickers for ACF fields
         */
        initDatePickers: function() {
            if (window.jQuery.fn.datepicker) {
                $('.wpfe-acf-date-picker').datepicker({
                    dateFormat: 'yy-mm-dd',
                    changeMonth: true,
                    changeYear: true,
                    onSelect: function(dateText) {
                        $(this).val(dateText).trigger('change');
                    }
                });
            }
        },
        
        /**
         * Initialize media selectors for image fields
         */
        initMediaSelectors: function() {
            // This is handled by event handlers added in renderField methods
        },

        /**
         * Initialize WYSIWYG editors.
         */
        initWysiwygEditors: function() {
            if (typeof wp !== 'undefined' && wp.editor && wp.editor.initialize) {
                $('.wpfe-editor-wysiwyg').each(function() {
                    var id = $(this).attr('id');
                    var self = this;
                    
                    // Check if editor already exists to avoid duplicate initialization
                    if (window.tinymce && window.tinymce.get(id)) {
                        return;
                    }
                    
                    wp.editor.initialize(id, {
                        tinymce: {
                            wpautop: true,
                            plugins: 'charmap colorpicker hr lists paste tabfocus textcolor fullscreen wordpress wpautoresize wpeditimage wpemoji wpgallery wplink wptextpattern',
                            toolbar1: 'formatselect bold italic bullist numlist blockquote alignleft aligncenter alignright link unlink wp_more fullscreen',
                            toolbar2: '',
                            height: 200,
                            setup: function(editor) {
                                // Update field value on content change
                                editor.on('change', function() {
                                    // Sync the editor content to the textarea
                                    editor.save();
                                    
                                    // If live preview is enabled, update the preview
                                    if (wpfe_data.live_preview) {
                                        var content = editor.getContent();
                                        var fieldName = $('#' + id).closest('.wpfe-editor-field').data('field-name');
                                        var $element = $('[data-wpfe-field="' + fieldName + '"]');
                                        
                                        if ($element.length) {
                                            // Update the content in the page
                                            $element.contents().not('.wpfe-edit-button').remove();
                                            // Use the correct rendering for content
                                            $element.prepend(content);
                                        }
                                    }
                                });
                            }
                        },
                        quicktags: {
                            buttons: 'strong,em,link,block,del,ins,img,ul,ol,li,code,close'
                        },
                        mediaButtons: true
                    });
                });
            } else {
                // Fallback for environments where wp.editor is not available
                $('.wpfe-editor-wysiwyg').each(function() {
                    $(this).css({
                        'width': '100%',
                        'min-height': '200px'
                    });
                });
            }
        },
        
        /**
         * Initialize taxonomy fields with search and selection behavior
         */
        initTaxonomyFields: function() {
            var self = this;
            
            // Handle taxonomy search
            $(document).on('input', '.wpfe-taxonomy-search-input', function() {
                var $field = $(this).closest('.wpfe-editor-taxonomy-field');
                var searchText = $(this).val().toLowerCase();
                
                // If empty search, show all items
                if (!searchText) {
                    $field.find('.wpfe-taxonomy-item').show();
                    return;
                }
                
                // Filter items based on search text
                $field.find('.wpfe-taxonomy-item').each(function() {
                    var termName = $(this).find('label').text().toLowerCase();
                    if (termName.indexOf(searchText) !== -1) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            });
            
            // Handle checkbox changes to update the hidden input value
            $(document).on('change', '.wpfe-taxonomy-checkbox', function() {
                var $field = $(this).closest('.wpfe-editor-taxonomy-field');
                var $hiddenInput = $field.find('input[type="hidden"]');
                var selectedValues = [];
                
                // Get all checked checkboxes
                $field.find('.wpfe-taxonomy-checkbox:checked').each(function() {
                    selectedValues.push(parseInt($(this).val(), 10));
                });
                
                // Update the hidden input value
                $hiddenInput.val(JSON.stringify(selectedValues));
                
                // If live preview is enabled, update the display
                if (wpfe_data.live_preview) {
                    // Implementation would depend on how taxonomies are displayed in the theme
                    // This is a simple approach - in practice, you might want to refresh the category/tag list display
                }
            });
            
            // Initialize relationship fields
            this.initRelationshipFields();
            
            // Initialize gallery fields
            this.initGalleryFields();
        },
        
        /**
         * Initialize relationship fields with search and selection functionality
         */
        initRelationshipFields: function() {
            var self = this;
            
            // Handle relationship field search
            $(document).on('input', '.wpfe-relationship-search-input', function() {
                var $field = $(this).closest('.wpfe-editor-relationship-field');
                var searchText = $(this).val().toLowerCase();
                
                // If empty search, show all items
                if (!searchText) {
                    $field.find('.wpfe-relationship-available-items .wpfe-relationship-item').show();
                    return;
                }
                
                // Filter items based on search text
                $field.find('.wpfe-relationship-available-items .wpfe-relationship-item').each(function() {
                    var itemText = $(this).find('.wpfe-relationship-item-title').text().toLowerCase();
                    if (itemText.indexOf(searchText) !== -1) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            });
            
            // Handle relationship add button click
            $(document).on('click', '.wpfe-relationship-add-button', function() {
                var $item = $(this).closest('.wpfe-relationship-item');
                var postId = $item.data('id');
                var $field = $(this).closest('.wpfe-editor-relationship-field');
                var $selectedContainer = $field.find('.wpfe-relationship-selected-items');
                var $hiddenInput = $field.find('input[type="hidden"]');
                var multiple = $field.data('multiple') === true;
                var maxItems = parseInt($field.data('max'), 10) || 0;
                
                // Check if we've hit the maximum number of items (if set)
                if (maxItems > 0) {
                    var currentCount = $selectedContainer.find('.wpfe-relationship-item').length;
                    if (currentCount >= maxItems) {
                        alert('Maximum number of items selected (' + maxItems + ')');
                        return;
                    }
                }
                
                // Clone the item and change button to remove
                var $clonedItem = $item.clone();
                $clonedItem.find('.wpfe-relationship-add-button')
                    .removeClass('wpfe-relationship-add-button')
                    .addClass('wpfe-relationship-remove-button')
                    .find('.dashicons')
                    .removeClass('dashicons-plus')
                    .addClass('dashicons-minus');
                
                // Add to selected container
                $selectedContainer.append($clonedItem);
                
                // If not multiple, hide the original item
                if (!multiple) {
                    $item.hide();
                }
                
                // Update the hidden input with selected values
                self.updateRelationshipValues($field);
            });
            
            // Handle relationship remove button click
            $(document).on('click', '.wpfe-relationship-remove-button', function() {
                var $item = $(this).closest('.wpfe-relationship-item');
                var postId = $item.data('id');
                var $field = $(this).closest('.wpfe-editor-relationship-field');
                var multiple = $field.data('multiple') === true;
                
                // Remove the item
                $item.remove();
                
                // If not multiple, show the original item again
                if (!multiple) {
                    $field.find('.wpfe-relationship-available-items .wpfe-relationship-item[data-id="' + postId + '"]').show();
                }
                
                // Update the hidden input with selected values
                self.updateRelationshipValues($field);
            });
            
            // Initialize sortable for relationship selected items (jQuery UI sortable)
            if ($.fn.sortable) {
                // Only initialize if there are relationship items
                var $relationshipContainers = $('.wpfe-relationship-selected-items');
                if ($relationshipContainers.length > 0) {
                    try {
                        $relationshipContainers.sortable({
                            update: function(event, ui) {
                                // Update values when items are reordered
                                var $field = $(this).closest('.wpfe-editor-relationship-field');
                                self.updateRelationshipValues($field);
                            },
                            placeholder: 'wpfe-relationship-sortable-placeholder',
                            forcePlaceholderSize: true,
                            cancel: 'button' // Prevent starting drag on buttons
                        });
                    } catch (e) {
                        if (wpfe_data.debug_mode) {
                            console.error('Error initializing sortable for relationship fields:', e);
                        }
                    }
                }
            }
        },
        
        /**
         * Initialize gallery fields with sorting and add/remove functionality
         */
        initGalleryFields: function() {
            var self = this;
            
            // Initialize sortable for gallery items
            if ($.fn.sortable) {
                // Only initialize sortable if gallery items exist
                var $galleries = $('.wpfe-sortable-gallery');
                if ($galleries.length > 0) {
                    try {
                        $galleries.sortable({
                            placeholder: 'wpfe-gallery-placeholder',
                            forcePlaceholderSize: true,
                            tolerance: 'pointer',
                            cursor: 'move',
                            update: function(event, ui) {
                                // Update the hidden input with the new order
                                var $gallery = $(this);
                                var $field = $gallery.closest('.wpfe-editor-gallery-field');
                                self.updateGalleryValues($field);
                            }
                        });
                    } catch (e) {
                        if (wpfe_data.debug_mode) {
                            console.error('Error initializing sortable for galleries:', e);
                        }
                    }
                }
            }
            
            // Handle add images button click
            $(document).on('click', '.wpfe-gallery-add', function() {
                var $field = $(this).closest('.wpfe-editor-gallery-field');
                var fieldName = $field.find('input[type="hidden"]').attr('name');
                
                self.openGalleryMedia(fieldName);
            });
            
            // Handle remove image button click
            $(document).on('click', '.wpfe-gallery-item-remove', function() {
                var $item = $(this).closest('.wpfe-gallery-item');
                var $field = $item.closest('.wpfe-editor-gallery-field');
                
                // Remove the item
                $item.remove();
                
                // Update gallery values
                self.updateGalleryValues($field);
            });
        },
        
        /**
         * Fetch gallery image data for images that don't have URLs
         * 
         * @param {string} fieldName The field name
         * @param {Array} imageIds Array of image IDs to fetch
         */
        fetchGalleryImageData: function(fieldName, imageIds) {
            var self = this;
            
            if (!imageIds || !imageIds.length) {
                return;
            }
            
            // Make AJAX request to get image data
            $.ajax({
                url: wpfe_data.ajax_url,
                method: 'GET',
                data: {
                    action: 'wpfe_get_gallery_data',
                    nonce: wpfe_data.nonce,
                    attachment_ids: JSON.stringify(imageIds)
                },
                success: function(response) {
                    if (response.success && response.data.images) {
                        var $field = $('.wpfe-editor-field[data-field-name="' + fieldName + '"]');
                        var $gallery = $field.find('.wpfe-gallery-preview');
                        
                        // Process each image
                        response.data.images.forEach(function(image) {
                            // Check if we already have this image in the gallery
                            var $existingItem = $gallery.find('.wpfe-gallery-item[data-id="' + image.id + '"]');
                            
                            if ($existingItem.length === 0) {
                                // Create new gallery item
                                var itemHtml = self.templates.galleryItem
                                    .replace(/{image_id}/g, image.id)
                                    .replace(/{image_url}/g, image.thumbnail_url);
                                
                                $gallery.append(itemHtml);
                            } else {
                                // Update existing item
                                $existingItem.find('img').attr('src', image.thumbnail_url);
                            }
                        });
                        
                        // If sortable is available, refresh it
                        if ($.fn.sortable && $gallery.hasClass('ui-sortable')) {
                            $gallery.sortable('refresh');
                        }
                    }
                },
                error: function() {
                    if (wpfe_data.debug_mode) {
                        console.error('Failed to fetch gallery image data for field:', fieldName);
                    }
                }
            });
        },
        
        /**
         * Open the WordPress media library for gallery selection
         * 
         * @param {string} fieldName The field name
         */
        openGalleryMedia: function(fieldName) {
            var self = this;
            
            // Get current gallery values
            var $field = $('.wpfe-editor-gallery-field').filter(function() {
                return $(this).find('input[type="hidden"]').attr('name') === fieldName;
            });
            
            var $hiddenInput = $field.find('input[type="hidden"]');
            var currentValue = $hiddenInput.val();
            var currentSelection = [];
            
            // Parse current value
            try {
                currentSelection = JSON.parse(currentValue);
                if (!Array.isArray(currentSelection)) {
                    currentSelection = [];
                }
            } catch (e) {
                currentSelection = [];
            }
            
            // Create the media frame
            var galleryFrame = wp.media({
                title: wpfe_data.i18n.select_gallery_images || 'Select Gallery Images',
                multiple: true,
                library: {
                    type: 'image'
                },
                button: {
                    text: wpfe_data.i18n.add_to_gallery || 'Add to Gallery'
                }
            });
            
            // Set selected images if we have current values
            if (currentSelection.length > 0 && galleryFrame.state().get('selection')) {
                var selection = galleryFrame.state().get('selection');
                
                currentSelection.forEach(function(attachmentId) {
                    var attachment = wp.media.attachment(attachmentId);
                    attachment.fetch();
                    selection.add(attachment ? [attachment] : []);
                });
            }
            
            // When images are selected
            galleryFrame.on('select', function() {
                var selection = galleryFrame.state().get('selection');
                var $galleryPreview = $field.find('.wpfe-gallery-preview');
                var newGalleryItems = [];
                
                // Clear existing items if replacing the gallery
                if (!wpfe_data.gallery_append) {
                    $galleryPreview.empty();
                    newGalleryItems = [];
                } else {
                    // Get existing IDs if appending
                    $galleryPreview.find('.wpfe-gallery-item').each(function() {
                        newGalleryItems.push(parseInt($(this).data('id'), 10));
                    });
                }
                
                // Add selected images
                selection.forEach(function(attachment) {
                    attachment = attachment.toJSON();
                    
                    // Skip if image already exists in gallery
                    if (newGalleryItems.indexOf(attachment.id) !== -1) {
                        return;
                    }
                    
                    // Add image ID to array
                    newGalleryItems.push(attachment.id);
                    
                    // Create gallery item element
                    var itemHtml = self.templates.galleryItem
                        .replace(/{image_id}/g, attachment.id)
                        .replace(/{image_url}/g, attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url);
                    
                    // Append to gallery preview
                    $galleryPreview.append(itemHtml);
                });
                
                // Update the hidden input value
                $hiddenInput.val(JSON.stringify(newGalleryItems));
            });
            
            // Open the media library
            galleryFrame.open();
        },
        
        /**
         * Update the hidden input with the current gallery items
         * 
         * @param {jQuery} $field The gallery field container
         */
        updateGalleryValues: function($field) {
            var $galleryItems = $field.find('.wpfe-gallery-item');
            var $hiddenInput = $field.find('input[type="hidden"]');
            var galleryValues = [];
            
            // Get all gallery item IDs in the current order
            $galleryItems.each(function() {
                galleryValues.push(parseInt($(this).data('id'), 10));
            });
            
            // Update the hidden input
            $hiddenInput.val(JSON.stringify(galleryValues));
            
            // If live preview is enabled, try to update the display
            if (wpfe_data.live_preview) {
                var fieldName = $field.closest('.wpfe-editor-field').data('field-name');
                var $element = $('[data-wpfe-field="' + fieldName + '"]');
                
                if ($element.length) {
                    // Simply reorder the existing gallery images if possible
                    var $galleryContainer = $element.find('.gallery, .wp-block-gallery, .acf-gallery');
                    
                    if ($galleryContainer.length) {
                        var $items = $galleryContainer.find('.gallery-item, .blocks-gallery-item, .acf-gallery-attachment');
                        
                        // Only try to reorder if we have the same number of items
                        if ($items.length === galleryValues.length) {
                            var $reorderedItems = $();
                            
                            // Reorder based on the new order
                            galleryValues.forEach(function(id) {
                                var $item = $items.filter(function() {
                                    return $(this).find('img').data('id') == id || 
                                           $(this).data('id') == id ||
                                           $(this).find('img').attr('data-attachment-id') == id;
                                });
                                
                                if ($item.length) {
                                    $reorderedItems = $reorderedItems.add($item);
                                }
                            });
                            
                            // Replace with reordered items if we found matches for all
                            if ($reorderedItems.length === $items.length) {
                                $items.detach();
                                $galleryContainer.append($reorderedItems);
                            }
                        }
                    }
                }
            }
        },
        
        /**
         * Update the hidden input with the current selection of relationship items
         * 
         * @param {jQuery} $field The relationship field container
         */
        updateRelationshipValues: function($field) {
            var $hiddenInput = $field.find('input[type="hidden"]');
            var selectedValues = [];
            var multiple = $field.data('multiple') === true;
            
            // Get all selected item IDs
            $field.find('.wpfe-relationship-selected-items .wpfe-relationship-item').each(function() {
                selectedValues.push(parseInt($(this).data('id'), 10));
            });
            
            // If not multiple and we have a value, just use the first one
            if (!multiple && selectedValues.length > 0) {
                $hiddenInput.val(selectedValues[0]);
            } else {
                // Otherwise set the JSON array
                $hiddenInput.val(JSON.stringify(selectedValues));
            }
        },

        /**
         * Save changes to the server.
         */
        saveChanges: function() {
            var self = this;
            var fieldsToSave = {};
            var hasChanges = false;
            
            // Collect field values
            $.each(this.fields, function(fieldName, fieldData) {
                var value;
                
                // Get value based on field type
                switch (fieldData.type) {
                    case 'wysiwyg':
                        // Get value from TinyMCE if available
                        if (typeof wp !== 'undefined' && wp.editor && wp.editor.getContent) {
                            value = wp.editor.getContent('wpfe-field-' + fieldName);
                        } else {
                            value = $('#wpfe-field-' + fieldName).val();
                        }
                        break;
                        
                    case 'taxonomy':
                        // Parse the JSON stored in the hidden input
                        var taxValue = $('#wpfe-field-' + fieldName).val();
                        try {
                            value = JSON.parse(taxValue);
                        } catch (e) {
                            value = [];
                        }
                        break;
                        
                    default:
                        value = $('#wpfe-field-' + fieldName).val();
                        break;
                }
                
                // Check if value has changed
                if (value !== self.originalValues[fieldName]) {
                    fieldsToSave[fieldName] = value;
                    hasChanges = true;
                }
            });
            
            // If no changes, just close the editor
            if (!hasChanges) {
                this.closeEditor();
                return;
            }
            
            // Show saving message
            this.sidebar.find('.wpfe-editor-message')
                .text(wpfe_data.i18n.saving)
                .removeClass('success error');
            
            // Disable save button
            this.sidebar.find('.wpfe-editor-sidebar-save').prop('disabled', true);
            
            // Make AJAX request
            $.ajax({
                url: wpfe_data.ajax_url,
                method: 'POST',
                data: {
                    action: 'wpfe_save_fields',
                    nonce: wpfe_data.nonce,
                    post_id: this.activePostId,
                    fields: fieldsToSave
                },
                success: function(response) {
                    // Enable save button
                    self.sidebar.find('.wpfe-editor-sidebar-save').prop('disabled', false);
                    
                    if (response.success) {
                        // Show success message
                        self.sidebar.find('.wpfe-editor-message')
                            .text(wpfe_data.i18n.success)
                            .addClass('success');
                            
                        // Update page content
                        self.updatePageContent(fieldsToSave);
                        
                        // Close editor after a delay
                        setTimeout(function() {
                            self.closeEditor();
                        }, 1500);
                    } else {
                        // Show error message
                        self.showError(response.data.message || wpfe_data.i18n.error);
                    }
                },
                error: function() {
                    // Enable save button
                    self.sidebar.find('.wpfe-editor-sidebar-save').prop('disabled', false);
                    
                    // Show error message
                    self.showError(wpfe_data.i18n.error);
                }
            });
        },

        /**
         * Update page content with new values.
         * 
         * @param {object} fields The fields to update.
         */
        updatePageContent: function(fields) {
            var self = this;
            
            // For each field, update the corresponding element in the page
            $.each(fields, function(fieldName, value) {
                var $element;
                
                // Handle core fields
                switch (fieldName) {
                    case 'post_title':
                        $element = $('.wpfe-editable[data-wpfe-field="post_title"], .wpfe-editable[data-wpfe-field="title"]');
                        if ($element.length) {
                            $element.contents().not('.wpfe-edit-button').remove();
                            $element.prepend(value);
                        }
                        // Also update page title
                        document.title = value + ' - ' + document.title.split(' - ').pop();
                        break;
                        
                    case 'post_content':
                        $element = $('.wpfe-editable[data-wpfe-field="post_content"], .wpfe-editable[data-wpfe-field="content"]');
                        if ($element.length) {
                            $element.contents().not('.wpfe-edit-button').remove();
                            $element.prepend(value);
                        }
                        break;
                        
                    case 'post_excerpt':
                        $element = $('.wpfe-editable[data-wpfe-field="post_excerpt"], .wpfe-editable[data-wpfe-field="excerpt"]');
                        if ($element.length) {
                            $element.contents().not('.wpfe-edit-button').remove();
                            $element.prepend(value);
                        }
                        break;
                        
                    case 'featured_image':
                        // Update featured image without page reload
                        if (value) {
                            // Find featured image elements - common selectors across themes
                            var $featuredImg = $('.post-thumbnail img, .wp-post-image, .attachment-post-thumbnail, article img.attachment-thumbnail');
                            if ($featuredImg.length) {
                                // Get the image data via AJAX
                                $.ajax({
                                    url: wpfe_data.ajax_url,
                                    method: 'GET',
                                    data: {
                                        action: 'wpfe_get_image_data',
                                        nonce: wpfe_data.nonce,
                                        attachment_id: value
                                    },
                                    success: function(response) {
                                        if (response.success && response.data.url) {
                                            // Update all featured image instances
                                            $featuredImg.each(function() {
                                                $(this).attr('src', response.data.url);
                                                // Also update srcset if it exists
                                                if (response.data.srcset) {
                                                    $(this).attr('srcset', response.data.srcset);
                                                }
                                            });
                                        }
                                    }
                                });
                            } else {
                                // If we can't find the featured image element, fall back to reload
                                location.reload();
                            }
                        } else {
                            // Image was removed, try to remove it from DOM
                            $('.post-thumbnail img, .wp-post-image, .attachment-post-thumbnail').remove();
                        }
                        break;
                        
                    default:
                        // Handle ACF fields
                        $element = $('[data-wpfe-field="' + fieldName + '"]');
                        if ($element.length) {
                            var fieldType = self.fields[fieldName] ? self.fields[fieldName].type : '';
                            
                            if (fieldType === 'repeater' || fieldType === 'flexible_content') {
                                // For complex fields, try AJAX refresh first
                                $.ajax({
                                    url: wpfe_data.ajax_url,
                                    method: 'GET',
                                    data: {
                                        action: 'wpfe_get_rendered_field',
                                        nonce: wpfe_data.nonce,
                                        post_id: self.activePostId,
                                        field_name: fieldName
                                    },
                                    success: function(response) {
                                        if (response.success && response.data.html) {
                                            // Replace the old content with the new rendered content
                                            $element.contents().not('.wpfe-edit-button').remove();
                                            $element.prepend(response.data.html);
                                        } else {
                                            // Fallback to reload if AJAX refresh fails
                                            location.reload();
                                        }
                                    },
                                    error: function() {
                                        // Fallback to reload if AJAX fails
                                        location.reload();
                                    }
                                });
                            } else if (fieldType === 'image' || fieldType === 'gallery') {
                                // For image fields, try to update the src
                                var $imgs = $element.find('img');
                                if ($imgs.length && typeof value === 'object' && value.url) {
                                    // Update image src
                                    $imgs.attr('src', value.url);
                                    if (value.srcset) {
                                        $imgs.attr('srcset', value.srcset);
                                    }
                                } else if ($imgs.length && typeof value === 'number') {
                                    // Get image data and update
                                    $.ajax({
                                        url: wpfe_data.ajax_url,
                                        method: 'GET',
                                        data: {
                                            action: 'wpfe_get_image_data',
                                            nonce: wpfe_data.nonce,
                                            attachment_id: value
                                        },
                                        success: function(response) {
                                            if (response.success && response.data.url) {
                                                $imgs.attr('src', response.data.url);
                                                if (response.data.srcset) {
                                                    $imgs.attr('srcset', response.data.srcset);
                                                }
                                            } else {
                                                location.reload();
                                            }
                                        },
                                        error: function() {
                                            location.reload();
                                        }
                                    });
                                } else {
                                    // Can't update, reload
                                    location.reload();
                                }
                            } else {
                                // Text-based fields
                                $element.contents().not('.wpfe-edit-button').remove();
                                $element.prepend(value);
                            }
                        }
                        break;
                }
            });
        },

        /**
         * Open the WordPress media library.
         * 
         * @param {string} fieldName The field name.
         */
        openMediaLibrary: function(fieldName) {
            var self = this;
            
            // Create the media frame if it doesn't exist
            if (!this.mediaFrame) {
                this.mediaFrame = wp.media({
                    title: wpfe_data.i18n.select_image || 'Select Image',
                    multiple: false,
                    library: {
                        type: 'image'
                    },
                    button: {
                        text: wpfe_data.i18n.select || 'Select'
                    }
                });
                
                // When an image is selected, run a callback
                this.mediaFrame.on('select', function() {
                    var attachment = self.mediaFrame.state().get('selection').first().toJSON();
                    
                    // Update the field value
                    $('#wpfe-field-' + self.activeMediaField).val(attachment.id);
                    
                    // Update the preview
                    var $field = $('.wpfe-editor-field[data-field-name="' + self.activeMediaField + '"]');
                    $field.find('.wpfe-editor-image-preview img').attr('src', attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url).show();
                    $field.find('.wpfe-editor-image-remove').show();
                });
            }
            
            // Store the active field
            this.activeMediaField = fieldName;
            
            // Open the media library
            this.mediaFrame.open();
        },

        /**
         * Remove an image from a field.
         * 
         * @param {string} fieldName The field name.
         */
        removeImage: function(fieldName) {
            // Clear the field value
            $('#wpfe-field-' + fieldName).val('');
            
            // Hide the preview
            var $field = $('.wpfe-editor-field[data-field-name="' + fieldName + '"]');
            $field.find('.wpfe-editor-image-preview img').hide();
            $field.find('.wpfe-editor-image-remove').hide();
        },

        /**
         * Show an error message.
         * 
         * @param {string} message The error message.
         */
        showError: function(message) {
            this.sidebar.find('.wpfe-editor-message')
                .text(message)
                .addClass('error')
                .removeClass('success');
        },

        /**
         * Escape HTML special characters.
         * 
         * @param {string} text The text to escape.
         * @returns {string} The escaped text.
         */
        escapeHtml: function(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Initialize when the DOM is ready
    $(document).ready(function() {
        // Safely initialize the editor
        try {
            wpfe.init();
        } catch (e) {
            console.error('Error initializing WP Frontend Editor:', e);
        }
        
        // Add safety checks for other scripts that might depend on our editor
        // This fixes the "Cannot read properties of undefined (reading 'instance')" error
        $(window).on('load', function() {
            // Ensure jQuery UI sortable is properly initialized
            if ($.fn.sortable && $('.wpfe-sortable-gallery').length) {
                try {
                    $('.wpfe-sortable-gallery').sortable('refresh');
                } catch (e) {
                    // Ignore errors, just a safety measure
                }
            }
        });
    });

    // Expose the wpfe object globally
    window.wpfe = wpfe;

})(jQuery);