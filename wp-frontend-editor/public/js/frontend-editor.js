/**
 * WP Frontend Editor JavaScript
 */

(function($) {
    'use strict';

    // Main plugin object
    var wpfe = {
        sidebar: null,
        overlay: null,
        editButtons: [],
        activeField: null,
        activePostId: null,
        fields: {},
        isEditing: false,
        originalValues: {},
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
            this.sidebar = $('#wpfe-editor-sidebar');
            this.overlay = $('#wpfe-editor-overlay');
            this.editButtons = $('.wpfe-edit-button');
            
            // Load templates
            this.loadTemplates();
            
            // Initialize event listeners
            this.initEvents();
            
            console.log('WP Frontend Editor initialized');
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
                image: $('#wpfe-editor-image-template').html()
            };
        },

        /**
         * Initialize event listeners.
         */
        initEvents: function() {
            var self = this;

            // Edit button click
            $(document).on('click', '.wpfe-edit-button', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var $button = $(this);
                var fieldName = $button.data('wpfe-field');
                var postId = $button.data('wpfe-post-id');
                
                self.openEditor(fieldName, postId, $button);
            });

            // Close sidebar
            this.sidebar.find('.wpfe-editor-sidebar-close').on('click', function() {
                self.closeEditor();
            });
            
            // Click on overlay
            this.overlay.on('click', function() {
                self.closeEditor();
            });

            // Save changes
            this.sidebar.find('.wpfe-editor-sidebar-save').on('click', function() {
                self.saveChanges();
            });

            // Cancel changes
            this.sidebar.find('.wpfe-editor-sidebar-cancel').on('click', function() {
                self.closeEditor();
            });

            // Image field events
            $(document).on('click', '.wpfe-editor-image-select', function() {
                var $field = $(this).closest('.wpfe-editor-field');
                var fieldName = $field.data('field-name');
                
                self.openMediaLibrary(fieldName);
            });
            
            $(document).on('click', '.wpfe-editor-image-remove', function() {
                var $field = $(this).closest('.wpfe-editor-field');
                var fieldName = $field.data('field-name');
                
                self.removeImage(fieldName);
            });

            // Handle keyboard events
            $(document).on('keydown', function(e) {
                // Escape key
                if (e.keyCode === 27 && self.isEditing) {
                    self.closeEditor();
                }
                
                // Enter key in fields
                if (e.keyCode === 13 && e.ctrlKey && self.isEditing) {
                    self.saveChanges();
                }
            });

            // Support for inline editing
            if (wpfe_data.enable_inline) {
                $(document).on('click', '.wpfe-editable', function(e) {
                    if (self.isEditing || $(e.target).hasClass('wpfe-edit-button')) {
                        return;
                    }
                    
                    var $element = $(this);
                    var fieldName = $element.data('wpfe-field');
                    var postId = $element.data('wpfe-post-id');
                    
                    if (fieldName && postId) {
                        self.openEditor(fieldName, postId, $element.find('.wpfe-edit-button'));
                    }
                });
            }
        },

        /**
         * Initialize ACF fields.
         * 
         * @param {Array} fields The ACF fields to initialize.
         */
        initAcfFields: function(fields) {
            var self = this;
            
            if (!fields || !fields.length) {
                return;
            }
            
            // Process each field
            $.each(fields, function(index, field) {
                var selector = field.selector;
                var $element = $(selector);
                
                if ($element.length) {
                    // Add editable class
                    $element.addClass('wpfe-editable');
                    
                    // Add data attributes
                    $element.attr({
                        'data-wpfe-field': field.key,
                        'data-wpfe-post-id': field.post_id
                    });
                    
                    // Create edit button
                    var $button = $(wpfe_data.edit_icon).addClass('wpfe-edit-button').attr({
                        'data-wpfe-field': field.key,
                        'data-wpfe-post-id': field.post_id,
                        'data-wpfe-field-type': 'acf'
                    });
                    
                    // Add button if it doesn't already exist
                    if (!$element.find('.wpfe-edit-button').length) {
                        $element.append($button);
                    }
                }
            });
        },

        /**
         * Open the editor sidebar.
         * 
         * @param {string} fieldName The field name.
         * @param {number} postId The post ID.
         * @param {jQuery} $button The edit button.
         */
        openEditor: function(fieldName, postId, $button) {
            var self = this;
            
            // Set active field
            this.activeField = fieldName;
            this.activePostId = postId;
            this.isEditing = true;
            
            // Show loading state
            this.sidebar.find('.wpfe-editor-sidebar-fields').empty();
            this.sidebar.find('.wpfe-editor-sidebar-loading').show();
            this.sidebar.find('.wpfe-editor-message').empty().removeClass('success error');
            this.sidebar.find('.wpfe-editor-field-name').text(fieldName);
            
            // Show sidebar and overlay
            this.sidebar.show();
            this.overlay.show();
            
            // Add active class after a small delay to trigger animation
            setTimeout(function() {
                self.sidebar.addClass('is-active');
            }, 10);
            
            // Fetch field data
            this.fetchField(fieldName, postId);
        },

        /**
         * Close the editor sidebar.
         */
        closeEditor: function() {
            var self = this;
            
            // Remove active class to trigger animation
            this.sidebar.removeClass('is-active');
            
            // Hide sidebar and overlay after animation finishes
            setTimeout(function() {
                self.sidebar.hide();
                self.overlay.hide();
                self.isEditing = false;
                self.activeField = null;
                self.activePostId = null;
                self.fields = {};
                self.originalValues = {};
            }, 300);
        },

        /**
         * Fetch field data from the server.
         * 
         * @param {string} fieldName The field name.
         * @param {number} postId The post ID.
         */
        fetchField: function(fieldName, postId) {
            var self = this;
            
            // Make AJAX request
            $.ajax({
                url: wpfe_data.ajax_url,
                method: 'GET',
                data: {
                    action: 'wpfe_get_fields',
                    nonce: wpfe_data.nonce,
                    post_id: postId,
                    fields: fieldName
                },
                success: function(response) {
                    if (response.success) {
                        self.fields = response.data;
                        self.renderFields();
                    } else {
                        self.showError(response.data.message || 'Error fetching field data');
                    }
                },
                error: function() {
                    self.showError('AJAX request failed');
                }
            });
        },

        /**
         * Render fields in the sidebar.
         */
        renderFields: function() {
            var self = this;
            var $fieldsContainer = this.sidebar.find('.wpfe-editor-sidebar-fields');
            
            // Hide loading
            this.sidebar.find('.wpfe-editor-sidebar-loading').hide();
            
            // Clear fields container
            $fieldsContainer.empty();
            
            // Store original values
            this.originalValues = {};
            
            // Render each field
            $.each(this.fields, function(fieldName, fieldData) {
                // Store original value
                self.originalValues[fieldName] = fieldData.value;
                
                // Render the field
                var $field = self.renderField(fieldName, fieldData);
                
                if ($field) {
                    $fieldsContainer.append($field);
                }
            });
            
            // Initialize WYSIWYG editors if present
            this.initWysiwygEditors();
        },

        /**
         * Render a single field.
         * 
         * @param {string} fieldName The field name.
         * @param {object} fieldData The field data.
         * @returns {jQuery} The field element.
         */
        renderField: function(fieldName, fieldData) {
            var fieldInput = '';
            
            // Generate input HTML based on field type
            switch (fieldData.type) {
                case 'text':
                    fieldInput = this.templates.text
                        .replace(/{field_name}/g, fieldName)
                        .replace(/{field_value}/g, this.escapeHtml(fieldData.value || ''));
                    break;
                    
                case 'textarea':
                    fieldInput = this.templates.textarea
                        .replace(/{field_name}/g, fieldName)
                        .replace(/{field_value}/g, this.escapeHtml(fieldData.value || ''));
                    break;
                    
                case 'wysiwyg':
                    fieldInput = this.templates.wysiwyg
                        .replace(/{field_name}/g, fieldName)
                        .replace(/{field_value}/g, this.escapeHtml(fieldData.value || ''));
                    break;
                    
                case 'image':
                    var hasImage = fieldData.value && fieldData.url;
                    fieldInput = this.templates.image
                        .replace(/{field_name}/g, fieldName)
                        .replace(/{field_value}/g, fieldData.value || '')
                        .replace(/{image_url}/g, fieldData.url || '')
                        .replace(/{preview_display}/g, hasImage ? 'block' : 'none')
                        .replace(/{remove_display}/g, hasImage ? 'inline-block' : 'none');
                    break;
                    
                default:
                    // For unsupported field types
                    fieldInput = '<p>' + wpfe_data.i18n.unsupported_field + '</p>';
                    break;
            }
            
            // Create field container from template
            var fieldHtml = this.templates.field
                .replace(/{field_name}/g, fieldName)
                .replace(/{field_type}/g, fieldData.type)
                .replace(/{field_label}/g, fieldData.label || fieldName)
                .replace(/{field_input}/g, fieldInput);
                
            return $(fieldHtml);
        },

        /**
         * Initialize WYSIWYG editors.
         */
        initWysiwygEditors: function() {
            if (typeof wp !== 'undefined' && wp.editor && wp.editor.initialize) {
                $('.wpfe-editor-wysiwyg').each(function() {
                    var id = $(this).attr('id');
                    
                    wp.editor.initialize(id, {
                        tinymce: {
                            wpautop: true,
                            plugins: 'charmap colorpicker hr lists paste tabfocus textcolor fullscreen wordpress wpautoresize wpeditimage wpemoji wpgallery wplink wptextpattern',
                            toolbar1: 'formatselect bold italic bullist numlist blockquote alignleft aligncenter alignright link unlink wp_more fullscreen',
                            toolbar2: '',
                            height: 200
                        },
                        quicktags: true
                    });
                });
            }
        },

        /**
         * Save changes to the server.
         */
        saveChanges: function() {
            var self = this;
            var fieldsToSave = {};
            var hasChanges = false;
            
            // Collect field values
            $.each(this.fields, function(fieldName, fieldData) {
                var value;
                
                // Get value based on field type
                switch (fieldData.type) {
                    case 'wysiwyg':
                        // Get value from TinyMCE if available
                        if (typeof wp !== 'undefined' && wp.editor && wp.editor.getContent) {
                            value = wp.editor.getContent('wpfe-field-' + fieldName);
                        } else {
                            value = $('#wpfe-field-' + fieldName).val();
                        }
                        break;
                        
                    default:
                        value = $('#wpfe-field-' + fieldName).val();
                        break;
                }
                
                // Check if value has changed
                if (value !== self.originalValues[fieldName]) {
                    fieldsToSave[fieldName] = value;
                    hasChanges = true;
                }
            });
            
            // If no changes, just close the editor
            if (!hasChanges) {
                this.closeEditor();
                return;
            }
            
            // Show saving message
            this.sidebar.find('.wpfe-editor-message')
                .text(wpfe_data.i18n.saving)
                .removeClass('success error');
            
            // Disable save button
            this.sidebar.find('.wpfe-editor-sidebar-save').prop('disabled', true);
            
            // Make AJAX request
            $.ajax({
                url: wpfe_data.ajax_url,
                method: 'POST',
                data: {
                    action: 'wpfe_save_fields',
                    nonce: wpfe_data.nonce,
                    post_id: this.activePostId,
                    fields: fieldsToSave
                },
                success: function(response) {
                    // Enable save button
                    self.sidebar.find('.wpfe-editor-sidebar-save').prop('disabled', false);
                    
                    if (response.success) {
                        // Show success message
                        self.sidebar.find('.wpfe-editor-message')
                            .text(wpfe_data.i18n.success)
                            .addClass('success');
                            
                        // Update page content
                        self.updatePageContent(fieldsToSave);
                        
                        // Close editor after a delay
                        setTimeout(function() {
                            self.closeEditor();
                        }, 1500);
                    } else {
                        // Show error message
                        self.showError(response.data.message || wpfe_data.i18n.error);
                    }
                },
                error: function() {
                    // Enable save button
                    self.sidebar.find('.wpfe-editor-sidebar-save').prop('disabled', false);
                    
                    // Show error message
                    self.showError(wpfe_data.i18n.error);
                }
            });
        },

        /**
         * Update page content with new values.
         * 
         * @param {object} fields The fields to update.
         */
        updatePageContent: function(fields) {
            var self = this;
            
            // For each field, update the corresponding element in the page
            $.each(fields, function(fieldName, value) {
                var $element;
                
                // Handle core fields
                switch (fieldName) {
                    case 'post_title':
                        $element = $('.wpfe-editable[data-wpfe-field="post_title"], .wpfe-editable[data-wpfe-field="title"]');
                        if ($element.length) {
                            $element.contents().not('.wpfe-edit-button').remove();
                            $element.prepend(value);
                        }
                        break;
                        
                    case 'post_content':
                        $element = $('.wpfe-editable[data-wpfe-field="post_content"], .wpfe-editable[data-wpfe-field="content"]');
                        if ($element.length) {
                            $element.contents().not('.wpfe-edit-button').remove();
                            $element.prepend(value);
                        }
                        break;
                        
                    case 'post_excerpt':
                        $element = $('.wpfe-editable[data-wpfe-field="post_excerpt"], .wpfe-editable[data-wpfe-field="excerpt"]');
                        if ($element.length) {
                            $element.contents().not('.wpfe-edit-button').remove();
                            $element.prepend(value);
                        }
                        break;
                        
                    case 'featured_image':
                        // Refresh the page to show updated featured image
                        if (value) {
                            location.reload();
                        }
                        break;
                        
                    default:
                        // Handle ACF fields
                        $element = $('[data-wpfe-field="' + fieldName + '"]');
                        if ($element.length) {
                            var fieldType = self.fields[fieldName] ? self.fields[fieldName].type : '';
                            
                            if (fieldType === 'image') {
                                // Image fields require a page reload
                                location.reload();
                            } else {
                                // Text-based fields
                                $element.contents().not('.wpfe-edit-button').remove();
                                $element.prepend(value);
                            }
                        }
                        break;
                }
            });
        },

        /**
         * Open the WordPress media library.
         * 
         * @param {string} fieldName The field name.
         */
        openMediaLibrary: function(fieldName) {
            var self = this;
            
            // Create the media frame if it doesn't exist
            if (!this.mediaFrame) {
                this.mediaFrame = wp.media({
                    title: wpfe_data.i18n.select_image,
                    multiple: false,
                    library: {
                        type: 'image'
                    },
                    button: {
                        text: wpfe_data.i18n.select
                    }
                });
                
                // When an image is selected, run a callback
                this.mediaFrame.on('select', function() {
                    var attachment = self.mediaFrame.state().get('selection').first().toJSON();
                    
                    // Update the field value
                    $('#wpfe-field-' + self.activeMediaField).val(attachment.id);
                    
                    // Update the preview
                    var $field = $('.wpfe-editor-field[data-field-name="' + self.activeMediaField + '"]');
                    $field.find('.wpfe-editor-image-preview img').attr('src', attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url).show();
                    $field.find('.wpfe-editor-image-remove').show();
                });
            }
            
            // Store the active field
            this.activeMediaField = fieldName;
            
            // Open the media library
            this.mediaFrame.open();
        },

        /**
         * Remove an image from a field.
         * 
         * @param {string} fieldName The field name.
         */
        removeImage: function(fieldName) {
            // Clear the field value
            $('#wpfe-field-' + fieldName).val('');
            
            // Hide the preview
            var $field = $('.wpfe-editor-field[data-field-name="' + fieldName + '"]');
            $field.find('.wpfe-editor-image-preview img').hide();
            $field.find('.wpfe-editor-image-remove').hide();
        },

        /**
         * Show an error message.
         * 
         * @param {string} message The error message.
         */
        showError: function(message) {
            this.sidebar.find('.wpfe-editor-message')
                .text(message)
                .addClass('error')
                .removeClass('success');
        },

        /**
         * Escape HTML special characters.
         * 
         * @param {string} text The text to escape.
         * @returns {string} The escaped text.
         */
        escapeHtml: function(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Initialize when the DOM is ready
    $(document).ready(function() {
        wpfe.init();
    });

    // Expose the wpfe object globally
    window.wpfe = wpfe;

})(jQuery);