/**
 * WP Frontend Editor Main Module
 * Initializes and coordinates all editor modules
 */

var WPFE = WPFE || {};

// Initialize the editor when document is ready
jQuery(document).ready(function($) {
    'use strict';
    
    // Initialize all modules
    WPFE.core.init();
    
    // Initialize native fields module if available
    if (typeof WPFE.nativeFields !== 'undefined') {
        WPFE.nativeFields.init();
    }
    
    // Add a debug helper if debug mode is enabled
    if (typeof wpfe_data !== 'undefined' && wpfe_data.debug_mode) {
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
            getActiveField: function() {
                return WPFE.core.getActiveField();
            },
            getModules: function() {
                return Object.keys(WPFE);
            }
        };
        
        console.log('WP Frontend Editor initialized in debug mode. Use window.wpfeDebug to access debug functions.');
    }
});