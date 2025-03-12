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
                return;
            }

            // Cache DOM elements
            sidebar = $('#wpfe-editor-sidebar');
            overlay = $('#wpfe-editor-overlay');
            
            // Load templates
            this.loadTemplates();
            
            // Initialize modules
            WPFE.events.init();
            WPFE.elements.init();
            WPFE.acf.init();
            WPFE.mobile.init();
            
            // Add highlight class if enabled in settings
            if (wpfe_data.highlight_editable) {
                $('body').addClass('wpfe-highlight-editable');
            }
            
            // Detect mobile device for better button visibility
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                $('body').addClass('wpfe-mobile-device');
            }
            
            // Apply custom width to sidebar if set
            if (wpfe_data.sidebar_width && parseInt(wpfe_data.sidebar_width) > 0) {
                sidebar.css('width', parseInt(wpfe_data.sidebar_width) + 'px');
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