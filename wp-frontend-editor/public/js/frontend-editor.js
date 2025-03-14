/**
 * WP Frontend Editor JavaScript
 * Module loader
 */

// Create the WPFE namespace for module sharing
var WPFE = WPFE || {};

// Add initialization markers
WPFE.modulesReady = {
    core: false,
    utils: false,
    elements: false,
    events: false,
    ajax: false,
    fields: false,
    ui: false,
    mobile: false,
    acf: false,
    main: false
};

// Add basic debugging features even before modules are loaded
WPFE.debug = {
    modulesLoaded: [],
    log: function(message) {
        if (typeof console !== 'undefined' && (typeof wpfe_data === 'undefined' || wpfe_data.debug_mode)) {
            console.log('[WPFE Debug] ' + message);
        }
    },
    error: function(message) {
        if (typeof console !== 'undefined') {
            console.error('[WPFE Error] ' + message);
        }
    },
    checkScriptLoading: function() {
        var loadedCount = 0;
        var moduleNames = Object.keys(WPFE.modulesReady);
        
        for (var i = 0; i < moduleNames.length; i++) {
            if (WPFE.modulesReady[moduleNames[i]]) {
                loadedCount++;
            }
        }
        
        console.log('[WPFE] Script Loading Status: ' + loadedCount + '/' + moduleNames.length + ' modules loaded');
        console.log('Missing modules: ' + moduleNames.filter(function(name) {
            return !WPFE.modulesReady[name];
        }).join(', '));
        
        return {
            total: moduleNames.length,
            loaded: loadedCount,
            missing: moduleNames.filter(function(name) {
                return !WPFE.modulesReady[name];
            })
        };
    },
    checkDataAvailability: function() {
        if (typeof wpfe_data === 'undefined') {
            console.error('[WPFE] Critical Error: wpfe_data is not defined! Script localization may have failed.');
            return false;
        }
        
        console.log('[WPFE] wpfe_data is available:', {
            post_id: wpfe_data.post_id,
            debug_mode: wpfe_data.debug_mode,
            highlight_editable: wpfe_data.highlight_editable,
            is_acf_active: wpfe_data.is_acf_active
        });
        
        return true;
    }
};

// Log initialization when the document is ready
jQuery(document).ready(function($) {
    WPFE.debug.log('Document ready, waiting for modules to load...');
    WPFE.debug.checkDataAvailability();
    
    // Check script loading status after a slight delay
    setTimeout(function() {
        WPFE.debug.checkScriptLoading();
    }, 1000);
});

// The original code has been refactored into:
// - modules/core.js - Core functionality and initialization
// - modules/utils.js - Utility functions
// - modules/elements.js - Editable element handling
// - modules/events.js - Event handling and user interactions
// - modules/ajax.js - Server communication
// - modules/fields.js - Field rendering and handling
// - modules/ui.js - UI components and notifications
// - modules/mobile.js - Mobile-specific functionality
// - modules/acf.js - Advanced Custom Fields integration
// - modules/main.js - Main initialization