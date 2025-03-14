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
                
                // Cache DOM elements with fallback creation
                sidebar = $('#wpfe-editor-sidebar');
                if (!sidebar.length) {
                    console.error('WP Frontend Editor: Sidebar element not found in the DOM. The editor sidebar template may not be properly loaded.');
                    console.warn('WP Frontend Editor: Creating emergency sidebar elements from core module');
                    
                    // Create emergency sidebar elements if they don't exist
                    var sidebarHTML = '<div id="wpfe-editor-sidebar" class="wpfe-editor-sidebar" style="display: none;">' +
                        '<div class="wpfe-editor-sidebar-header">' +
                            '<div class="wpfe-editor-sidebar-header-content">' +
                                '<h2 class="wpfe-editor-sidebar-title">' +
                                    '<span class="wpfe-editor-field-name"></span>' +
                                '</h2>' +
                            '</div>' +
                            '<div class="wpfe-editor-sidebar-controls">' +
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
                    
                    // Append to body and update reference
                    $('body').append(sidebarHTML);
                    $('body').append(overlayHTML);
                    
                    // Reassign the elements
                    sidebar = $('#wpfe-editor-sidebar');
                    if (sidebar.length) {
                        console.log('WP Frontend Editor: Emergency sidebar created successfully');
                    }
                }
                
                overlay = $('#wpfe-editor-overlay');
                if (!overlay.length) {
                    console.error('WP Frontend Editor: Overlay element not found in the DOM. The editor sidebar template may not be properly loaded.');
                    
                    // Create emergency overlay if it doesn't exist
                    $('body').append('<div id="wpfe-editor-overlay" class="wpfe-editor-overlay" style="display: none;"></div>');
                    overlay = $('#wpfe-editor-overlay');
                }
                
                // Load templates with error handling
                try {
                    this.loadTemplates();
                    console.log('WP Frontend Editor: Templates loaded successfully');
                } catch (e) {
                    console.error('WP Frontend Editor: Error loading templates:', e);
                    
                    // Create emergency template handling
                    this.templates = {
                        field: '<div class="wpfe-editor-field" data-field-name="{field_name}">{field_input}</div>',
                        text: '<input type="text" value="{field_value}">',
                        textarea: '<textarea>{field_value}</textarea>',
                        wysiwyg: '<textarea>{field_value}</textarea>'
                    };
                    console.warn('WP Frontend Editor: Created emergency template stubs');
                }
                
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
                    try {
                        moduleInitStatus[moduleName] = true;
                        $(document).trigger('wpfe:module_initialized', [moduleName]);
                        
                        if (wpfe_data && wpfe_data.debug_mode) {
                            console.log('WP Frontend Editor: Module initialized:', moduleName);
                        }
                    } catch (e) {
                        console.error('WP Frontend Editor: Error marking module as initialized:', moduleName, e);
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
         * Load HTML templates for the editor with fallbacks.
         */
        loadTemplates: function() {
            try {
                // Define emergency templates in case DOM templates aren't found
                var emergencyTemplates = {
                    field: '<div class="wpfe-editor-field" data-field-name="{field_name}" data-field-type="{field_type}"><label for="wpfe-field-{field_name}">{field_label}</label><div class="wpfe-editor-field-input">{field_input}</div></div>',
                    text: '<input type="text" id="wpfe-field-{field_name}" name="{field_name}" value="{field_value}" class="wpfe-editor-input">',
                    textarea: '<textarea id="wpfe-field-{field_name}" name="{field_name}" rows="5" class="wpfe-editor-input">{field_value}</textarea>',
                    wysiwyg: '<div class="wpfe-editor-wysiwyg-container"><textarea id="wpfe-field-{field_name}" name="{field_name}" class="wpfe-editor-wysiwyg">{field_value}</textarea></div>',
                    image: '<div class="wpfe-editor-image-preview"><img src="{image_url}" alt=""></div><input type="hidden" id="wpfe-field-{field_name}" name="{field_name}" value="{field_value}" class="wpfe-editor-input"><div class="wpfe-editor-image-buttons"><button type="button" class="button wpfe-editor-image-select">Select Image</button><button type="button" class="button wpfe-editor-image-remove">Remove Image</button></div>',
                    gallery: '<div class="wpfe-editor-gallery-field"><div class="wpfe-gallery-preview">{gallery_items}</div><input type="hidden" id="wpfe-field-{field_name}" name="{field_name}" value="{field_value}" class="wpfe-editor-input"><div class="wpfe-gallery-buttons"><button type="button" class="button wpfe-gallery-add">Add Images</button></div></div>',
                    galleryItem: '<div class="wpfe-gallery-item" data-id="{image_id}"><img src="{image_url}" alt=""><div class="wpfe-gallery-item-actions"><button type="button" class="wpfe-gallery-item-remove"><span class="dashicons dashicons-no-alt"></span></button></div></div>',
                    taxonomy: '<div class="wpfe-editor-taxonomy-field" data-taxonomy="{taxonomy}"><div class="wpfe-taxonomy-items">{taxonomy_items}</div></div>',
                    taxonomyItem: '<div class="wpfe-taxonomy-item"><label><input type="{input_type}" class="wpfe-taxonomy-checkbox" value="{term_id}" {checked}>{term_name}</label></div>'
                };
                
                // Try to load from DOM first
                this.templates = {};
                var templatesFound = true;
                
                // Check if template exists in DOM
                if (!$('#wpfe-editor-field-template').length || 
                    !$('#wpfe-editor-text-template').length || 
                    !$('#wpfe-editor-textarea-template').length) {
                    console.warn('[WPFE] Required templates not found in DOM - using emergency templates');
                    templatesFound = false;
                }
                
                // Either load from DOM or use emergency templates
                if (templatesFound) {
                    this.templates = {
                        field: $('#wpfe-editor-field-template').html() || emergencyTemplates.field,
                        text: $('#wpfe-editor-text-template').html() || emergencyTemplates.text,
                        textarea: $('#wpfe-editor-textarea-template').html() || emergencyTemplates.textarea,
                        wysiwyg: $('#wpfe-editor-wysiwyg-template').html() || emergencyTemplates.wysiwyg,
                        image: $('#wpfe-editor-image-template').html() || emergencyTemplates.image,
                        gallery: $('#wpfe-editor-gallery-template').html() || emergencyTemplates.gallery,
                        galleryItem: $('#wpfe-editor-gallery-item-template').html() || emergencyTemplates.galleryItem,
                        taxonomy: $('#wpfe-editor-taxonomy-template').html() || emergencyTemplates.taxonomy,
                        taxonomyItem: $('#wpfe-editor-taxonomy-item-template').html() || emergencyTemplates.taxonomyItem
                    };
                    console.log('[WPFE] Templates loaded from DOM');
                } else {
                    this.templates = emergencyTemplates;
                    console.log('[WPFE] Using emergency templates - DOM templates not found');
                }
            } catch (e) {
                console.error('[WPFE] Error loading templates:', e);
                // Failsafe - ensure basic templates exist no matter what
                this.templates = {
                    field: '<div class="wpfe-editor-field" data-field-name="{field_name}">{field_input}</div>',
                    text: '<input type="text" value="{field_value}">',
                    textarea: '<textarea>{field_value}</textarea>',
                    wysiwyg: '<textarea>{field_value}</textarea>',
                    image: '<input type="hidden" value="{field_value}"><button>Select Image</button>'
                };
                console.warn('[WPFE] Using minimal fallback templates due to error');
            }
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