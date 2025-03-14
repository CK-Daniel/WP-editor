/**
 * WP Frontend Editor - Element Buttons Module
 * Handles adding edit buttons to editable elements
 */

(function($, WPFE) {
    'use strict';

    // Initialize the buttons functionality in the elements namespace
    WPFE.elements = WPFE.elements || {};
    
    /**
     * Add an edit button to an element
     * 
     * @param {Object} $element jQuery element object
     * @param {string} fieldName Field name
     * @param {number} postId Post ID (optional)
     * @return {Object} The created button element
     */
    WPFE.elements.addEditButton = function($element, fieldName, postId) {
        // Skip if element already has a button
        if ($element.attr('data-wpfe-has-button') === 'true' || $element.find('.wpfe-edit-button').length > 0) {
            return null;
        }
        
        // Ensure element has the necessary classes and attributes
        WPFE.elements.prepareElement($element, fieldName, null, postId);
        
        // Button position
        var buttonPosition = wpfe_data.button_position || 'top-right';
        var positionClass = 'wpfe-button-' + buttonPosition;
        
        // Button style
        var buttonStyle = wpfe_data.button_style || 'icon-only';
        var buttonContent = '';
        
        if (buttonStyle === 'icon-only') {
            buttonContent = '<span class="dashicons dashicons-edit"></span>';
        } else if (buttonStyle === 'text-only') {
            buttonContent = '<span class="wpfe-button-text">' + wpfe_data.i18n.edit + '</span>';
        } else { // icon-text
            buttonContent = '<span class="dashicons dashicons-edit"></span><span class="wpfe-button-text">' + wpfe_data.i18n.edit + '</span>';
        }
        
        // Create button element
        var $button = $('<button></button>')
            .addClass('wpfe-edit-button')
            .addClass(positionClass)
            .attr('data-wpfe-field', fieldName)
            .attr('data-wpfe-post-id', postId || wpfe_data.post_id)
            .html(buttonContent + '<span class="screen-reader-text">' + wpfe_data.i18n.edit + '</span>');
        
        // Append button to element
        $element.append($button);
        
        // Mark element as having a button
        $element.attr('data-wpfe-has-button', 'true');
        
        // For debugging, highlight elements if specified
        if (wpfe_data.highlight_editable || wpfe_data.debug_mode) {
            $element.addClass('wpfe-highlight');
        }
        
        // Debug info
        if (wpfe_data.debug_mode) {
            console.log('[WPFE] Added edit button to element for field: ' + fieldName);
        }
        
        return $button;
    };
    
    /**
     * Refresh all buttons on the page
     */
    WPFE.elements.refreshButtons = function() {
        // Find all editable elements
        $('.wpfe-editable').each(function() {
            var $element = $(this);
            var fieldName = $element.attr('data-wpfe-field');
            var postId = $element.attr('data-wpfe-post-id') || wpfe_data.post_id;
            
            // Add button if needed
            if (!$element.attr('data-wpfe-has-button') || $element.find('.wpfe-edit-button').length === 0) {
                if (fieldName && postId) {
                    WPFE.elements.addEditButton($element, fieldName, postId);
                }
            }
        });
    };
    
    /**
     * Add a manual button placement function when in debug mode
     */
    WPFE.elements.setupManualButtonPlacement = function() {
        // In debug mode, add an emergency manual placement function to the global scope
        if (wpfe_data.debug_mode) {
            console.log('[WPFE] Adding manual button function to window.wpfeAddButtonTo');
            
            window.wpfeAddButtonTo = function(selector) {
                try {
                    var $element = $(selector);
                    if ($element.length) {
                        try {
                            WPFE.elements.addEditButton($element, 'manual_content', wpfe_data.post_id);
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
        }
    };

    // Initialize the manual button placement function
    $(document).ready(function() {
        WPFE.elements.setupManualButtonPlacement();
    });
    
    // Register this module as ready
    WPFE.modulesReady['element-buttons'] = true;
    
})(jQuery, WPFE);