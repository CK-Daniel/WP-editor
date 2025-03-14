/**
 * WP Frontend Editor JavaScript
 * Module loader
 */

// Create the WPFE namespace for module sharing
var WPFE = WPFE || {};

// Create fallback wpfe_data if not properly localized by WordPress
if (typeof window.wpfe_data === 'undefined') {
    console.error('[WPFE] CRITICAL ERROR: wpfe_data is not defined! Creating emergency fallback.');
    
    // Try to extract post ID from body class - common in WordPress themes
    var postId = 0;
    try {
        var bodyElement = document.querySelector('body');
        if (bodyElement) {
            var bodyClass = bodyElement.className || '';
            var postIdMatch = bodyClass.match(/postid-(\d+)/);
            if (postIdMatch && postIdMatch[1]) {
                postId = parseInt(postIdMatch[1], 10);
                console.log('[WPFE] Extracted post ID from body class:', postId);
            } else {
                // Try alternative formats used by some themes
                var altMatch = bodyClass.match(/post-(\d+)/) || bodyClass.match(/single-post-(\d+)/);
                if (altMatch && altMatch[1]) {
                    postId = parseInt(altMatch[1], 10);
                    console.log('[WPFE] Extracted post ID from alternative body class format:', postId);
                }
            }
        }
    } catch (e) {
        console.error('[WPFE] Error extracting post ID from body class:', e);
    }
    
    // Create the emergency fallback object
    window.wpfe_data = {
        ajax_url: '/wp-admin/admin-ajax.php',
        nonce: '',
        post_id: postId,
        plugin_url: '',
        debug_mode: true,
        button_position: 'top-right',
        button_style: 'icon-only',
        highlight_editable: true,
        discover_fields: true,
        page_content: {},
        is_acf_active: false,
        emergency_fallback: true,
        force_visible: true, // Force button visibility in emergency mode
        i18n: {
            edit: 'Edit',
            save: 'Save',
            cancel: 'Cancel',
            error: 'Error',
            select_image: 'Select Image',
            remove: 'Remove'
        }
    };
}

// Add initialization markers - ensure this exists before modules load
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

// Ensure modules object exists
WPFE.modules = WPFE.modules || {};

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
    
    // Create necessary DOM elements if they don't exist
    if ($('#wpfe-editor-sidebar').length === 0) {
        console.warn('[WPFE] Editor sidebar not found in DOM. Creating emergency sidebar elements.');
        createEmergencySidebar();
    }
    
    // Ensure ACF module is properly initialized if ACF is active
    if (wpfe_data.is_acf_active && (!WPFE.acf || typeof WPFE.acf.init !== 'function')) {
        console.warn('[WPFE] ACF is active but ACF module is not initialized properly. Creating fallback.');
        WPFE.acf = WPFE.acf || {};
        WPFE.acf.init = function() {
            console.warn('[WPFE] Using ACF module fallback initialization');
            return true;
        };
        WPFE.acf.getFieldValue = function(fieldName) {
            return null;
        };
        WPFE.acf.isAcfField = function(fieldName) {
            return fieldName.indexOf('acf_') === 0;
        };
        WPFE.modulesReady.acf = true;
    }
    
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

// Function to create emergency sidebar elements if they don't exist in the DOM
// This function helps prevent errors if the wp_footer action doesn't fire properly
function createEmergencySidebar() {
    console.warn('[WPFE] Creating emergency sidebar elements - the PHP template may not be loading properly');
    
    // If the elements module doesn't exist, create a stub
    if (!WPFE.elements) {
        console.warn('[WPFE] Creating emergency stub for elements module');
        WPFE.elements = {
            init: function() {
                console.warn('[WPFE] Using emergency elements stub');
                return true;
            },
            addEditButton: function() {
                console.warn('[WPFE] Using emergency addEditButton stub');
            },
            refreshElements: function() {
                console.warn('[WPFE] Using emergency refreshElements stub');
            },
            isStub: true
        };
        WPFE.modulesReady.elements = true;
    }
    var sidebarHTML = '<div id="wpfe-editor-sidebar" class="wpfe-editor-sidebar" style="display: none;">' +
        '<div class="wpfe-editor-sidebar-header">' +
            '<div class="wpfe-editor-sidebar-header-content">' +
                '<h2 class="wpfe-editor-sidebar-title">' +
                    '<span class="wpfe-editor-field-name"></span>' +
                    '<div class="wpfe-editor-field-badges">' +
                        '<span class="wpfe-editor-field-type"></span>' +
                        '<span class="wpfe-editor-field-source"></span>' +
                    '</div>' +
                '</h2>' +
            '</div>' +
            '<div class="wpfe-editor-sidebar-controls">' +
                '<button type="button" class="wpfe-editor-sidebar-minimize">' +
                    '<span class="dashicons dashicons-minus"></span>' +
                '</button>' +
                '<button type="button" class="wpfe-editor-sidebar-close">' +
                    '<span class="dashicons dashicons-no-alt"></span>' +
                '</button>' +
            '</div>' +
        '</div>' +
        '<div class="wpfe-editor-sidebar-content">' +
            '<div class="wpfe-editor-sidebar-fields"></div>' +
        '</div>' +
        '<div class="wpfe-editor-sidebar-footer">' +
            '<div class="wpfe-editor-sidebar-actions">' +
                '<button type="button" class="wpfe-editor-sidebar-cancel">Cancel</button>' +
                '<button type="button" class="wpfe-editor-sidebar-save">Save Changes</button>' +
            '</div>' +
        '</div>' +
    '</div>';
    
    var overlayHTML = '<div id="wpfe-editor-overlay" class="wpfe-editor-overlay" style="display: none;"></div>';
    
    // Append the emergency elements to the body
    jQuery('body').append(sidebarHTML);
    jQuery('body').append(overlayHTML);
    
    console.log('[WPFE] Emergency sidebar and overlay elements created');
}

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