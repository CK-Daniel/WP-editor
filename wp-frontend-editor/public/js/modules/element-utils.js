/**
 * WP Frontend Editor - Element Utils Module
 * Utility functions for element handling
 */

(function($, WPFE) {
    'use strict';

    // Initialize the utils functionality in the elements namespace
    WPFE.elements = WPFE.elements || {};
    
    /**
     * Initialize element discovery and setup
     */
    WPFE.elements.setupElements = function() {
        WPFE.debug.log('Setting up elements');
        
        // Only run discovery if enabled in settings
        if (wpfe_data.discover_fields) {
            WPFE.elements.runProgressiveDiscovery();
        } else {
            WPFE.debug.log('Field discovery disabled in settings');
            
            // Still process existing marked elements
            WPFE.elements.findMarkedElements();
        }
        
        // Add event listener for new content
        $(document).on('wpfe:content_updated', function() {
            WPFE.elements.refreshButtons();
        });
        
        // Create debug helper for developers
        WPFE.elements.createDebugHelper();
    };
    
    /**
     * Refresh all elements on the page
     */
    WPFE.elements.refreshElements = function() {
        WPFE.debug.log('Refreshing elements');
        
        // Only run discovery if enabled in settings
        if (wpfe_data.discover_fields) {
            WPFE.elements.runProgressiveDiscovery();
        } else {
            // Still process existing marked elements
            WPFE.elements.findMarkedElements();
        }
        
        // Refresh buttons
        WPFE.elements.refreshButtons();
        
        // Trigger custom event
        $(document).trigger('wpfe:elements_refreshed');
    };
    
    /**
     * Create debug helper for developers
     */
    WPFE.elements.createDebugHelper = function() {
        if (!wpfe_data.debug_mode) {
            return;
        }
        
        // Add debug functions to the global WPFE namespace
        WPFE.debug = WPFE.debug || {};
        
        // Function to show all discovered elements
        WPFE.debug.showDiscoveredElements = function() {
            var elements = WPFE.elements.getDiscoveredElements();
            console.log('[WPFE Debug] ' + elements.length + ' discovered elements:');
            
            elements.forEach(function(data, index) {
                console.log('[' + index + '] Field: ' + data.fieldName + ', Type: ' + data.fieldType + ', Confidence: ' + data.confidence);
                
                // Highlight the element temporarily
                $(data.element).css({
                    'outline': '3px dashed red',
                    'background-color': 'rgba(255, 0, 0, 0.1)'
                });
                
                // Remove highlight after 3 seconds
                setTimeout(function() {
                    $(data.element).css({
                        'outline': '',
                        'background-color': ''
                    });
                }, 3000);
            });
        };
        
        // Function to force element discovery
        WPFE.debug.forceDiscovery = function() {
            console.log('[WPFE Debug] Forcing element discovery...');
            WPFE.elements.runProgressiveDiscovery();
            return WPFE.elements.getElementCount() + ' elements found';
        };
        
        // Function to add a button to any element
        WPFE.debug.addButtonTo = function(selector, fieldName) {
            var $element = $(selector);
            if ($element.length) {
                fieldName = fieldName || 'debug_field';
                WPFE.elements.addEditButton($element, fieldName, wpfe_data.post_id);
                return 'Button added to ' + selector;
            } else {
                return 'Element not found: ' + selector;
            }
        };
        
        console.log('[WPFE] Debug helper functions available: WPFE.debug.showDiscoveredElements(), WPFE.debug.forceDiscovery(), WPFE.debug.addButtonTo(selector, fieldName)');
    };

    // Initialize on document ready
    $(document).ready(function() {
        WPFE.elements.setupElements();
    });
    
    // Register this module as ready
    WPFE.modulesReady['element-utils'] = true;
    
})(jQuery, WPFE);