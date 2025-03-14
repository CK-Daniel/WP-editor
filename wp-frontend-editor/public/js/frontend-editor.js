/**
 * WP Frontend Editor JavaScript
 * Module loader
 */

// Create the WPFE namespace for module sharing
var WPFE = WPFE || {};

// Create fallback wpfe_data if not properly localized by WordPress
if (typeof window.wpfe_data === 'undefined') {
    console.error('[WPFE] CRITICAL ERROR: wpfe_data is not defined! Creating emergency fallback.');
    window.wpfe_data = {
        ajax_url: '/wp-admin/admin-ajax.php',
        nonce: '',
        post_id: document.querySelector('body').className.match(/postid-(\d+)/) ? 
                document.querySelector('body').className.match(/postid-(\d+)/)[1] : 0,
        plugin_url: '',
        debug_mode: true,
        button_position: 'top-right',
        button_style: 'icon-only',
        highlight_editable: true,
        discover_fields: true,
        page_content: {},
        is_acf_active: false,
        emergency_fallback: true,
        i18n: {
            edit: 'Edit',
            save: 'Save',
            cancel: 'Cancel',
            error: 'Error'
        }
    };
}

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
            is_acf_active: wpfe_data.is_acf_active,
            emergency_fallback: wpfe_data.emergency_fallback || false
        });
        
        // Check if using emergency fallback data
        if (wpfe_data.emergency_fallback) {
            console.warn('[WPFE] Using emergency fallback data. The editor may have limited functionality.');
            console.warn('[WPFE] This could be caused by:');
            console.warn('  1. The wp_localize_script function failed in PHP');
            console.warn('  2. The script was not properly enqueued');
            console.warn('  3. A JavaScript error prevented proper initialization');
        }
        
        return true;
    }
};

// Log initialization when the document is ready
jQuery(document).ready(function($) {
    WPFE.debug.log('Document ready, waiting for modules to load...');
    WPFE.debug.checkDataAvailability();
    
    // Check for script elements to ensure files are being loaded
    var scriptCheck = function() {
        var scriptElements = document.querySelectorAll('script[src*="wp-frontend-editor"]');
        console.log('[WPFE] Found ' + scriptElements.length + ' WP Frontend Editor script elements');
        
        if (scriptElements.length > 0) {
            // Log the paths to help with debugging
            console.log('[WPFE] Script elements found:');
            Array.prototype.forEach.call(scriptElements, function(script) {
                console.log(' - ' + script.src);
            });
        } else {
            console.error('[WPFE] No script elements found with "wp-frontend-editor" in the src attribute!');
        }
        
        // Specifically look for modules
        var moduleScripts = document.querySelectorAll('script[src*="modules"]');
        console.log('[WPFE] Found ' + moduleScripts.length + ' module script elements');
        
        if (moduleScripts.length > 0) {
            // Log each module script
            console.log('[WPFE] Module scripts found:');
            Array.prototype.forEach.call(moduleScripts, function(script) {
                // Extract module name from URL
                var urlParts = script.src.split('/');
                var filename = urlParts[urlParts.length - 1];
                var moduleName = filename.replace('.js', '').replace(/\?.+$/, '');
                
                console.log(' - ' + moduleName + ': ' + script.src);
                
                // Check if module registered itself
                if (WPFE.modulesReady && moduleName in WPFE.modulesReady) {
                    console.log('   Status: ' + (WPFE.modulesReady[moduleName] ? 'Loaded' : 'Not loaded'));
                }
            });
        } else {
            console.error('[WPFE] No module scripts found!');
        }
    };
    
    // Run script check
    scriptCheck();
    
    // Check script loading status after a slight delay
    setTimeout(function() {
        WPFE.debug.checkScriptLoading();
    }, 1000);
    
    // Final check after a longer delay
    setTimeout(function() {
        console.log('[WPFE] Final module loading check:');
        WPFE.debug.checkScriptLoading();
        scriptCheck();
    }, 3000);
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