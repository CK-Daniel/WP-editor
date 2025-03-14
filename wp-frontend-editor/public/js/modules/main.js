/**
 * WP Frontend Editor Main Module
 * Initializes and coordinates all editor modules
 */

var WPFE = WPFE || {};

// Initialize the editor when document is ready
jQuery(document).ready(function($) {
    'use strict';
    
    // Mark this module as loaded
    WPFE.modulesReady.main = true;
    if (WPFE.debug && WPFE.debug.modulesLoaded) {
        WPFE.debug.modulesLoaded.push('main');
    }
    
    // Initialize with more robust debugging
    console.log('[WPFE] Main module initializing...');
    
    if (typeof wpfe_data === 'undefined') {
        console.error('[WPFE] CRITICAL ERROR: wpfe_data is not defined! Plugin data not properly loaded.');
        
        // Check if jQuery is properly loaded
        if (typeof jQuery !== 'undefined') {
            console.log('[WPFE] jQuery is loaded (version: ' + jQuery.fn.jquery + ')');
        } else {
            console.error('[WPFE] jQuery is not loaded!');
        }
        
        // Check if wp-util is available
        if (typeof wp !== 'undefined' && typeof wp.template !== 'undefined') {
            console.log('[WPFE] wp-util is loaded');
        } else {
            console.error('[WPFE] wp-util is not loaded!');
        }
        
        return;
    }
    
    // Check if all required modules are loaded
    var missingModules = [];
    for (var module in WPFE.modulesReady) {
        if (!WPFE.modulesReady[module] && module !== 'main') {
            missingModules.push(module);
        }
    }
    
    if (missingModules.length > 0) {
        console.warn('[WPFE] Warning: Some modules are not loaded: ' + missingModules.join(', '));
    } else {
        console.log('[WPFE] All modules successfully loaded');
    }
    
    // Initialize core module
    WPFE.core.init();
    
    // Initialize native fields module if available
    if (typeof WPFE.nativeFields !== 'undefined') {
        WPFE.nativeFields.init();
    }
    
    // Add debug output about what was found
    console.log('Found ' + $('.wpfe-editable').length + ' editable elements');
    console.log('Found ' + $('.wpfe-edit-button').length + ' edit buttons');
    console.log('Post ID: ' + wpfe_data.post_id);
    console.log('Button position: ' + wpfe_data.button_position);
    console.log('Button style: ' + wpfe_data.button_style);
    
    // Add a debug helper if debug mode is enabled
    if (wpfe_data.debug_mode) {
        window.wpfeDebug = {
            getVersion: function() {
                return wpfe_data.version || '1.0';
            },
            getData: function() {
                return wpfe_data;
            },
            getEditableElements: function() {
                return $('.wpfe-editable').length;
            },
            getEditButtons: function() {
                return $('.wpfe-edit-button').length;
            },
            getActiveField: function() {
                return WPFE.core.getActiveField();
            },
            refreshElements: function() {
                WPFE.elements.refreshElements();
                return 'Elements refreshed. Found ' + $('.wpfe-editable').length + ' editable elements and ' + $('.wpfe-edit-button').length + ' buttons.';
            },
            forceAddButtons: function() {
                $('.wpfe-editable').each(function() {
                    var $element = $(this);
                    var fieldName = $element.data('wpfe-field');
                    var postId = $element.data('wpfe-post-id') || wpfe_data.post_id;
                    
                    if (fieldName && postId) {
                        WPFE.elements.addEditButton($element, fieldName, postId);
                    }
                });
                return 'Buttons added. Found ' + $('.wpfe-edit-button').length + ' edit buttons.';
            },
            getModules: function() {
                return Object.keys(WPFE);
            }
        };
        
        console.log('WP Frontend Editor initialized in debug mode. Use window.wpfeDebug to access debug functions.');
    }
});