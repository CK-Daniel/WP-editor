/**
 * WP Frontend Editor Core Module
 * Base functionality and initialization for the editor
 */

var WPFE = WPFE || {};

WPFE.core = (function($) {
    'use strict';

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
                
                // Initialize modules with error handling
                try {
                    WPFE.events.init();
                } catch (e) {
                    console.error('WP Frontend Editor: Error initializing events module:', e);
                }
                
                try {
                    WPFE.elements.init();
                } catch (e) {
                    console.error('WP Frontend Editor: Error initializing elements module:', e);
                }
                
                if (typeof WPFE.acf !== 'undefined') {
                    try {
                        WPFE.acf.init();
                    } catch (e) {
                        console.error('WP Frontend Editor: Error initializing ACF module:', e);
                    }
                } else {
                    console.log('WP Frontend Editor: ACF module not available or not loaded.');
                }
                
                if (typeof WPFE.mobile !== 'undefined') {
                    try {
                        WPFE.mobile.init();
                    } catch (e) {
                        console.error('WP Frontend Editor: Error initializing mobile module:', e);
                    }
                }
                
                // Add highlight class if enabled in settings
                if (wpfe_data.highlight_editable) {
                    $('body').addClass('wpfe-highlight-editable');
                }
                
                // Force editable elements to be visible for debugging
                $('body').addClass('wpfe-debug-mode');
                $('body').addClass('wpfe-highlight-editable');
                
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