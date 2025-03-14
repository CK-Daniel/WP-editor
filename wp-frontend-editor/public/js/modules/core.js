/**
 * WP Frontend Editor Core Module
 * Base functionality and initialization for the editor
 */

var WPFE = WPFE || {};

WPFE.core = (function($) {
    'use strict';
    
    // Mark this module as loaded
    WPFE.modulesReady.core = true;
    if (WPFE.debug && WPFE.debug.modulesLoaded) {
        WPFE.debug.modulesLoaded.push('core');
    }

    // Private variables
    var sidebar = null;
    var overlay = null;
    var editButtons = [];
    var activeField = null;
    var activePostId = null;
    var isEditing = false;
    var originalValues = {};

    // Public API
    return {
        fields: {},
        templates: {},

        /**
         * Initialize the frontend editor.
         */
        init: function() {
            // Only initialize for users who can edit
            if (typeof wpfe_data === 'undefined') {
                console.error('WP Frontend Editor: wpfe_data is not defined. The plugin may not be properly initialized.');
                return;
            }

            try {
                console.log('WP Frontend Editor Core initializing...');
                
                // Cache DOM elements
                sidebar = $('#wpfe-editor-sidebar');
                if (!sidebar.length) {
                    console.error('WP Frontend Editor: Sidebar element not found in the DOM. The editor sidebar template may not be properly loaded.');
                }
                
                overlay = $('#wpfe-editor-overlay');
                if (!overlay.length) {
                    console.error('WP Frontend Editor: Overlay element not found in the DOM. The editor sidebar template may not be properly loaded.');
                }
                
                // Load templates
                this.loadTemplates();
                
                // Initialize modules in proper dependency order with event-based communication
                var moduleInitStatus = {
                    utils: true, // Already loaded
                    core: true,  // We're in core init
                    events: false,
                    elements: false,
                    fields: false,
                    acf: false,
                    mobile: false
                };
                
                // Track module initialization status
                function markModuleInitialized(moduleName) {
                    moduleInitStatus[moduleName] = true;
                    $(document).trigger('wpfe:module_initialized', [moduleName]);
                    
                    if (wpfe_data.debug_mode) {
                        console.log('WP Frontend Editor: Module initialized:', moduleName);
                    }
                }
                
                // Initialize events module first (required for all interaction)
                try {
                    WPFE.events.init();
                    markModuleInitialized('events');
                } catch (e) {
                    console.error('WP Frontend Editor: Error initializing events module:', e);
                }
                
                // Wait for events module before initializing elements
                $(document).one('wpfe:module_initialized', function(event, module) {
                    if (module === 'events') {
                        try {
                            WPFE.elements.init();
                            markModuleInitialized('elements');
                        } catch (e) {
                            console.error('WP Frontend Editor: Error initializing elements module:', e);
                        }
                    }
                });
                
                // Initialize optional modules after elements
                $(document).one('wpfe:module_initialized', function(event, module) {
                    if (module === 'elements') {
                        // Initialize ACF module if available
                        if (typeof WPFE.acf !== 'undefined') {
                            try {
                                WPFE.acf.init();
                                markModuleInitialized('acf');
                            } catch (e) {
                                console.error('WP Frontend Editor: Error initializing ACF module:', e);
                            }
                        } else if (wpfe_data.debug_mode) {
                            console.log('WP Frontend Editor: ACF module not available or not loaded.');
                        }
                        
                        // Initialize mobile module if available
                        if (typeof WPFE.mobile !== 'undefined') {
                            try {
                                WPFE.mobile.init();
                                markModuleInitialized('mobile');
                            } catch (e) {
                                console.error('WP Frontend Editor: Error initializing mobile module:', e);
                            }
                        }
                    }
                });
                
                // Add highlight and debug classes only if enabled in settings
                if (wpfe_data.highlight_editable) {
                    $('body').addClass('wpfe-highlight-editable');
                }
                
                if (wpfe_data.debug_mode) {
                    $('body').addClass('wpfe-debug-mode');
                }
                
                // Detect mobile device for better button visibility
                if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                    $('body').addClass('wpfe-mobile-device');
                }
                
                // Apply custom width to sidebar if set
                if (wpfe_data.sidebar_width && parseInt(wpfe_data.sidebar_width) > 0) {
                    sidebar.css('width', parseInt(wpfe_data.sidebar_width) + 'px');
                }
                
                // Log debug info
                console.log('Editor sidebar found:', sidebar.length > 0);
                console.log('Editor overlay found:', overlay.length > 0);
                console.log('Editor options:', wpfe_data);
            } catch (e) {
                console.error('WP Frontend Editor: Error during core initialization:', e);
            }
            
            // Handle window resize events
            var self = this;
            $(window).on('resize', WPFE.utils.throttle(function() {
                // Adjust sidebar position on window resize
                if (isEditing) {
                    if ($(window).width() < 768) {
                        sidebar.css({
                            'bottom': '0',
                            'right': '0',
                            'top': 'auto',
                            'height': '80%',
                            'width': '100%'
                        });
                    } else {
                        sidebar.css({
                            'top': '',
                            'right': '',
                            'bottom': '',
                            'height': '',
                            'width': ''
                        });
                    }
                }
            }, 250));
            
            if (wpfe_data.debug_mode) {
                console.log('WP Frontend Editor initialized', wpfe_data);
            }
        },

        /**
         * Load HTML templates for the editor.
         */
        loadTemplates: function() {
            this.templates = {
                field: $('#wpfe-editor-field-template').html(),
                text: $('#wpfe-editor-text-template').html(),
                textarea: $('#wpfe-editor-textarea-template').html(),
                wysiwyg: $('#wpfe-editor-wysiwyg-template').html(),
                image: $('#wpfe-editor-image-template').html(),
                gallery: $('#wpfe-editor-gallery-template').html(),
                galleryItem: $('#wpfe-editor-gallery-item-template').html(),
                taxonomy: $('#wpfe-editor-taxonomy-template').html(),
                taxonomyItem: $('#wpfe-editor-taxonomy-item-template').html()
            };
        },

        // Getter methods for private variables
        getSidebar: function() {
            return sidebar;
        },
        
        getOverlay: function() {
            return overlay;
        },
        
        getEditButtons: function() {
            return editButtons;
        },
        
        setEditButtons: function(buttons) {
            editButtons = buttons;
        },
        
        getActiveField: function() {
            return activeField;
        },
        
        setActiveField: function(field) {
            activeField = field;
        },
        
        getActivePostId: function() {
            return activePostId;
        },
        
        setActivePostId: function(id) {
            activePostId = id;
        },
        
        isEditingActive: function() {
            return isEditing;
        },
        
        setEditingState: function(state) {
            isEditing = state;
        },
        
        getOriginalValues: function() {
            return originalValues;
        },
        
        setOriginalValue: function(key, value) {
            originalValues[key] = value;
        }
    };
})(jQuery);