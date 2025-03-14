/**
 * WP Frontend Editor Main Module
 * Initializes and coordinates all editor modules
 */

var WPFE = WPFE || {};

// IMPORTANT: This script must be loaded LAST in the dependency chain
// Initialize the editor when document is ready AND all other modules have loaded
jQuery(document).ready(function($) {
    'use strict';
    
    // Wait for wpfe_data to be available before initializing
    var checkWpfeData = function() {
        if (typeof window.wpfe_data !== 'undefined') {
            initMainModule();
        } else {
            console.warn('[WPFE] wpfe_data not loaded yet, retrying in 100ms...');
            setTimeout(checkWpfeData, 100);
        }
    };
    
    function initMainModule() {
        // Verify all modules have loaded
        console.log('[WPFE] Main module starting - verifying all modules are loaded...');
        
        // Mark this module as loaded
        WPFE.modulesReady = WPFE.modulesReady || {};
        WPFE.modulesReady.main = true;
        if (WPFE.debug && WPFE.debug.modulesLoaded) {
            WPFE.debug.modulesLoaded.push('main');
        }
        
        console.log('[WPFE] Main module initialized with wpfe_data:', wpfe_data.version);
        
        // Add helper function to mark modules as initialized
        WPFE.markModuleInitialized = function(moduleName) {
            if (WPFE.modulesReady && typeof moduleName === 'string') {
                WPFE.modulesReady[moduleName] = true;
                console.log('[WPFE] Module marked as initialized:', moduleName);
            }
        };
        
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
        
        // Initial module check
        var allModulesLoaded = checkModules();
        
        // Continue with initialization
        continueInitialization(allModulesLoaded);
    }
    
    // Continue with the initialization process
    function continueInitialization(allModulesLoaded) {
        // If modules are missing, try again after a delay
        if (!allModulesLoaded) {
            console.log('[WPFE] Scheduling retry for module loading check');
            setTimeout(function() {
                // Final check and proceed anyway
                checkModules();
                console.log('[WPFE] Final module loading status:');
                if (WPFE.debug && WPFE.debug.checkScriptLoading) {
                    WPFE.debug.checkScriptLoading();
                }
                
                // Call findAcfFields directly to ensure it runs early
                if (WPFE.elements && typeof WPFE.elements.findAcfFields === 'function' && wpfe_data.post_id) {
                    console.log('[WPFE] Running early ACF field detection...');
                    try {
                        WPFE.elements.findAcfFields(wpfe_data.post_id);
                    } catch (e) {
                        console.error('[WPFE] Error in early ACF field detection:', e);
                    }
                }
                
                initializeCoreAndModules();
            }, 1000);
        } else {
            // All modules loaded, proceed immediately
            initializeCoreAndModules();
        }
    }
    
    // Initialize core and other modules
    function initializeCoreAndModules() {
        // Initialize core module with error handling
        try {
            console.log('[WPFE] Initializing core module...');
            if (WPFE.core && typeof WPFE.core.init === 'function') {
                WPFE.core.init();
                console.log('[WPFE] Core module initialized successfully');
            } else {
                throw new Error('Core module not available');
            }
        } catch (e) {
            console.error('[WPFE] Error initializing core module:', e);
            
            // Emergency fallback if core fails to initialize
            console.warn('[WPFE] Creating emergency core module fallbacks');
            createEmergencyFallbacks();
        }
        
        // Initialize native fields module if available
        if (typeof WPFE.nativeFields !== 'undefined') {
            try {
                WPFE.nativeFields.init();
                console.log('[WPFE] Native fields module initialized');
            } catch (e) {
                console.error('[WPFE] Error initializing native fields module:', e);
            }
        }
        
        // Add debug output about what was found
        console.log('[WPFE] Found ' + $('.wpfe-editable').length + ' editable elements');
        console.log('[WPFE] Found ' + $('.wpfe-edit-button').length + ' edit buttons');
        console.log('[WPFE] Post ID: ' + wpfe_data.post_id);
        
        // Set up debug helper
        setupDebugHelper();
    }
    
    // Create emergency fallbacks for critical modules
    function createEmergencyFallbacks() {
        if (!WPFE.elements || typeof WPFE.elements.init !== 'function') {
            console.warn('[WPFE] Creating elements module emergency fallback');
            WPFE.elements = WPFE.elements || {};
            WPFE.elements.init = function() { 
                console.warn('[WPFE] Using elements fallback stub'); 
                return true; 
            };
            WPFE.elements.refreshElements = function() { 
                console.warn('[WPFE] Using refreshElements fallback stub'); 
            };
            WPFE.elements.addEditButton = function() { 
                console.warn('[WPFE] Using addEditButton fallback stub'); 
            };
            if (WPFE.modulesReady) {
                WPFE.modulesReady.elements = true;
            }
        }
        
        if (!WPFE.events || typeof WPFE.events.init !== 'function') {
            console.warn('[WPFE] Creating events module emergency fallback');
            WPFE.events = WPFE.events || {};
            WPFE.events.init = function() { 
                console.warn('[WPFE] Using events fallback stub'); 
                return true; 
            };
            if (WPFE.modulesReady) {
                WPFE.modulesReady.events = true;
            }
        }
        
        // Trigger manual initialization of elements module
        try {
            console.log('[WPFE] Manually initializing elements module fallback');
            WPFE.elements.init();
        } catch (elemErr) {
            console.error('[WPFE] Failed to initialize elements fallback:', elemErr);
        }
    }
    
    // Set up debug helper functions
    function setupDebugHelper() {
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
                    return WPFE.core && WPFE.core.getActiveField ? WPFE.core.getActiveField() : null;
                },
                refreshElements: function() {
                    if (WPFE.elements && WPFE.elements.refreshElements) {
                        WPFE.elements.refreshElements();
                    }
                    return 'Elements refreshed. Found ' + $('.wpfe-editable').length + ' editable elements and ' + $('.wpfe-edit-button').length + ' buttons.';
                },
                forceAddButtons: function() {
                    $('.wpfe-editable').each(function() {
                        var $element = $(this);
                        var fieldName = $element.data('wpfe-field');
                        var postId = $element.data('wpfe-post-id') || wpfe_data.post_id;
                        
                        if (fieldName && postId && WPFE.elements && WPFE.elements.addEditButton) {
                            WPFE.elements.addEditButton($element, fieldName, postId);
                        }
                    });
                    return 'Buttons added. Found ' + $('.wpfe-edit-button').length + ' edit buttons.';
                },
                getModules: function() {
                    return Object.keys(WPFE);
                }
            };
            
            console.log('[WPFE] WP Frontend Editor initialized in debug mode. Use window.wpfeDebug to access debug functions.');
        }
    }
    
    // Start the initialization process by waiting for wpfe_data
    checkWpfeData();
});