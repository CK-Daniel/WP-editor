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
        
        console.warn('[WPFE] Using emergency fallback wpfe_data created in frontend-editor.js');
        
        // Check if emergency fallback was created
        if (wpfe_data && wpfe_data.emergency_fallback) {
            console.log('[WPFE] Emergency fallback wpfe_data is available. Continuing with limited functionality.');
        } else {
            console.error('[WPFE] Emergency fallback wpfe_data was not created properly. Editor may not function.');
            return;
        }
    }
    
    // Enhanced module loading check with retry mechanism
    var checkModules = function() {
        var missingModules = [];
        var loadedCount = 0;
        var totalModules = 0;
        
        for (var module in WPFE.modulesReady) {
            totalModules++;
            if (WPFE.modulesReady[module]) {
                loadedCount++;
            } else if (module !== 'main') {
                missingModules.push(module);
            }
        }
        
        if (missingModules.length > 0) {
            console.warn('[WPFE] Warning: Some modules are not loaded: ' + missingModules.join(', '));
            console.log('[WPFE] Module loading status: ' + loadedCount + '/' + totalModules);
            
            // Add additional debug information about the missing modules
            missingModules.forEach(function(moduleName) {
                // Check if the script element exists
                var scriptElement = document.querySelector('script[src*="' + moduleName + '.js"]');
                if (scriptElement) {
                    console.log('[WPFE] Module ' + moduleName + ' script was found in the DOM but did not initialize properly');
                } else {
                    console.error('[WPFE] Module ' + moduleName + ' script was not found in the DOM - script may not have been loaded');
                }
                
                // Check if the module object exists but isn't marked as ready
                if (WPFE[moduleName]) {
                    console.log('[WPFE] Module object ' + moduleName + ' exists but is not marked as ready');
                } else {
                    console.error('[WPFE] Module object ' + moduleName + ' does not exist');
                }
            });
            
            // Try to explicitly define missing modules with a simple stub to prevent errors
            missingModules.forEach(function(moduleName) {
                if (!WPFE[moduleName]) {
                    console.log('[WPFE] Creating minimal fallback for missing module: ' + moduleName);
                    WPFE[moduleName] = {
                        init: function() {
                            console.warn('[WPFE] Using fallback initialization for module: ' + moduleName);
                            return true;
                        },
                        isStub: true
                    };
                    // Mark as ready to prevent errors
                    WPFE.modulesReady[moduleName] = true;
                }
            });
        } else {
            console.log('[WPFE] All modules successfully loaded');
        }
        
        return missingModules.length === 0;
    };
    
    // Initial check
    var allModulesLoaded = checkModules();
    
    // If modules are missing, try again after a delay
    if (!allModulesLoaded) {
        console.log('[WPFE] Scheduling retry for module loading check');
        setTimeout(function() {
            checkModules();
            console.log('[WPFE] Final module loading status:');
            WPFE.debug.checkScriptLoading();
        }, 1000);
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