/**
 * WP Frontend Editor - Elements Module
 * Proxy module that loads the modularized elements files
 */

(function($, WPFE) {
    'use strict';
    
    // Create base namespace
    WPFE.elements = WPFE.elements || {};
    
    // Flag to track module initialization
    var initialized = false;
    
    /**
     * Initialize the elements module
     * This function will be called from main.js
     */
    WPFE.elements.init = function() {
        if (initialized) {
            return true;
        }
        
        WPFE.debug.log('Elements module initializing');
        
        // Check if all required modules are loaded
        if (!WPFE.modulesReady.core || !WPFE.modulesReady.utils) {
            console.error('[WPFE] Cannot initialize elements module: Core or Utils module not ready');
            return false;
        }
        
        // The actual initialization happens in the individual modules
        // This just verifies everything was loaded correctly
        
        // Ensure critical functions exist
        if (typeof WPFE.elements.addEditButton !== 'function') {
            console.error('[WPFE] Critical function missing: addEditButton');
            return false;
        }
        
        if (typeof WPFE.elements.runProgressiveDiscovery !== 'function') {
            console.error('[WPFE] Critical function missing: runProgressiveDiscovery');
            return false;
        }
        
        initialized = true;
        WPFE.debug.log('Elements module initialized successfully');
        return true;
    };
    
    // Register this module as ready
    WPFE.modulesReady.elements = true;
    
})(jQuery, WPFE);