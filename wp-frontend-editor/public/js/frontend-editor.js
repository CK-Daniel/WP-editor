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
            
            // Load templates
            this.loadTemplates();
            
            // Initialize event listeners
            this.initEvents();
            
            // Initialize editable elements
            this.initEditableElements();
            
            // Add highlight class if enabled in settings
            if (wpfe_data.highlight_editable) {
                $('body').addClass('wpfe-highlight-editable');
            }
            
            // Apply custom width to sidebar if set
            if (wpfe_data.sidebar_width && parseInt(wpfe_data.sidebar_width) > 0) {
                this.sidebar.css('width', parseInt(wpfe_data.sidebar_width) + 'px');
            }
            
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

        /**
         * Initialize editable elements.
         */
        initEditableElements: function() {
            var self = this;
            
            // Check for editable elements with core WordPress fields
            var coreFields = [
                { name: 'post_title', selector: '.entry-title, .post-title, h1.title, h2.title' },
                { name: 'post_content', selector: '.entry-content, .post-content, .content' },
                { name: 'post_excerpt', selector: '.entry-summary, .excerpt, .post-excerpt' }
            ];
            
            // Process each core field
            $.each(coreFields, function(index, field) {
                var elements = $(field.selector);
                
                if (elements.length) {
                    elements.each(function() {
                        var $element = $(this);
                        var postId = wpfe_data.post_id;
                        
                        // Don't apply to elements that already have the editable class
                        if (!$element.hasClass('wpfe-editable')) {
                            // Add editable class and data attributes
                            $element.addClass('wpfe-editable')
                                .attr('data-wpfe-field', field.name)
                                .attr('data-wpfe-post-id', postId);
                            
                            // Create edit button
                            self.addEditButton($element, field.name, postId);
                        }
                    });
                }
            });
            
            // Cache all edit buttons after initialization
            this.editButtons = $('.wpfe-edit-button');
        },
        
        /**
         * Add edit button to an element.
         * 
         * @param {jQuery} $element The element to add button to.
         * @param {string} fieldName The field name.
         * @param {number} postId The post ID.
         */
        addEditButton: function($element, fieldName, postId) {
            var buttonContent = '';
            var positionClass = 'wpfe-button-' + (wpfe_data.button_position || 'top-right');
            
            // Button content based on style
            if (wpfe_data.button_style === 'icon-text') {
                buttonContent = '<span class="dashicons dashicons-edit"></span><span class="wpfe-button-text">' + wpfe_data.i18n.edit + '</span>';
            } else if (wpfe_data.button_style === 'text-only') {
                buttonContent = '<span class="wpfe-button-text">' + wpfe_data.i18n.edit + '</span>';
            } else {
                buttonContent = '<span class="dashicons dashicons-edit"></span>';
            }
            
            // Create button element
            var $button = $('<button>')
                .addClass('wpfe-edit-button ' + positionClass)
                .attr('data-wpfe-field', fieldName)
                .attr('data-wpfe-post-id', postId)
                .attr('aria-label', wpfe_data.i18n.edit)
                .html(buttonContent);
            
            // Add button to the element
            $element.append($button);
        },

        /**
         * Throttle function to limit how often a function can be called
         * @param {Function} func The function to throttle
         * @param {number} limit The time limit in ms
         * @returns {Function} Throttled function
         */
        throttle: function(func, limit) {
            var lastFunc;
            var lastRan;
            return function() {
                var context = this;
                var args = arguments;
                if (!lastRan) {
                    func.apply(context, args);
                    lastRan = Date.now();
                } else {
                    clearTimeout(lastFunc);
                    lastFunc = setTimeout(function() {
                        if ((Date.now() - lastRan) >= limit) {
                            func.apply(context, args);
                            lastRan = Date.now();
                        }
                    }, limit - (Date.now() - lastRan));
                }
            };
        },
        
        /**
         * Build hierarchical taxonomy terms HTML
         * 
         * @param {Object} termsByParent Terms organized by parent ID
         * @param {number} parentId The current parent ID to process
         * @param {number} level The indentation level
         * @param {Array} selectedValues Array of selected term IDs
         * @param {string} taxonomy The taxonomy name
         * @returns {string} HTML for the hierarchical terms
         */
        buildHierarchicalTermsHtml: function(termsByParent, parentId, level, selectedValues, taxonomy) {
            var html = '';
            var self = this;
            var indent = level * 20; // 20px indent per level
            
            // If no terms for this parent, return empty string
            if (!termsByParent[parentId]) {
                return html;
            }
            
            // Process terms for this parent
            termsByParent[parentId].forEach(function(term) {
                var checked = selectedValues.indexOf(term.value) !== -1 ? 'checked' : '';
                
                // Add this term
                html += self.templates.taxonomyItem
                    .replace(/{indent}/g, indent)
                    .replace(/{input_type}/g, 'checkbox')
                    .replace(/{taxonomy}/g, taxonomy)
                    .replace(/{term_id}/g, term.value)
                    .replace(/{checked}/g, checked)
                    .replace(/{term_name}/g, term.label)
                    .replace(/{term_count}/g, term.count || 0);
                
                // Process children if any
                if (termsByParent[term.value]) {
                    html += self.buildHierarchicalTermsHtml(termsByParent, term.value, level + 1, selectedValues, taxonomy);
                }
            });
            
            return html;
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
                
                // Ctrl+Enter or Cmd+Enter to save
                if ((e.ctrlKey || e.metaKey) && e.keyCode === 13 && self.isEditing) {
                    self.saveChanges();
                }
            });

            // Support for inline editing if enabled
            if (wpfe_data.enable_inline) {
                $(document).on('click', '.wpfe-editable', function(e) {
                    if (self.isEditing || $(e.target).hasClass('wpfe-edit-button') || $(e.target).closest('.wpfe-edit-button').length) {
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
            
            if (wpfe_data.debug_mode) {
                console.log('ACF Fields to initialize:', fields);
            }
            
            // Process each field
            $.each(fields, function(index, field) {
                // Skip fields without a valid selector or key
                if (!field.selector || !field.key) {
                    if (wpfe_data.debug_mode) {
                        console.log('Skipping field with missing selector or key:', field);
                    }
                    return true; // Continue to next field
                }
                
                try {
                    // Validate the selector to avoid jQuery errors
                    // This will throw an error if the selector is invalid
                    var $testSelector = $(document.createElement('div')).find(field.selector);
                    
                    // If we got here, the selector is valid
                    var $elements = $(field.selector);
                    
                    if (wpfe_data.debug_mode) {
                        console.log('Looking for elements with selector:', field.selector, 'Found:', $elements.length);
                    }
                    
                    if ($elements.length) {
                        $elements.each(function() {
                            var $element = $(this);
                            
                            // Don't apply to elements that already have the editable class
                            if (!$element.hasClass('wpfe-editable')) {
                                // Add editable class and data attributes
                                $element.addClass('wpfe-editable')
                                    .attr('data-wpfe-field', field.key)
                                    .attr('data-wpfe-post-id', field.post_id)
                                    .attr('data-wpfe-field-type', 'acf');
                                
                                // Create and add edit button
                                self.addEditButton($element, field.key, field.post_id);
                            }
                        });
                    }
                } catch (e) {
                    // Log error for invalid selector
                    if (wpfe_data.debug_mode) {
                        console.error('Invalid selector for field:', field.key, field.selector, e);
                    }
                }
            });
            
            // Update edit buttons cache
            this.editButtons = $('.wpfe-edit-button');
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
            
            // Set field name in header
            var fieldLabel = fieldName;
            if ($button && $button.length) {
                // Try to get a more user-friendly name from the parent element
                var $parent = $button.closest('.wpfe-editable');
                if ($parent.length && $parent.data('wpfe-field-label')) {
                    fieldLabel = $parent.data('wpfe-field-label');
                }
            }
            this.sidebar.find('.wpfe-editor-field-name').text(fieldLabel);
            
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
                
                // Clean up WP Editor if it was initialized
                if (typeof wp !== 'undefined' && wp.editor && wp.editor.remove) {
                    $('.wpfe-editor-wysiwyg').each(function() {
                        wp.editor.remove($(this).attr('id'));
                    });
                }
                
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
                        self.showError(response.data.message || wpfe_data.i18n.error);
                    }
                },
                error: function() {
                    self.showError(wpfe_data.i18n.error);
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
            
            // Initialize taxonomy fields
            this.initTaxonomyFields();
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
                
                case 'gallery':
                    // Process gallery field
                    var galleryItemsHtml = '';
                    var galleryValues = [];
                    var missingImageIds = [];
                    
                    // Handle various formats of gallery data
                    if (Array.isArray(fieldData.value)) {
                        // Process array of image IDs or objects
                        fieldData.value.forEach(function(item) {
                            var imageId, imageUrl;
                            
                            // Different formats from ACF
                            if (typeof item === 'object' && item !== null) {
                                imageId = item.id || item.ID || '';
                                imageUrl = item.url || item.sizes?.thumbnail?.url || '';
                            } else {
                                imageId = item;
                                // We'll need to get the URL via AJAX later
                                imageUrl = '';
                            }
                            
                            if (imageId) {
                                galleryValues.push(imageId);
                                
                                // Add gallery item if we have the URL
                                if (imageUrl) {
                                    galleryItemsHtml += this.templates.galleryItem
                                        .replace(/{image_id}/g, imageId)
                                        .replace(/{image_url}/g, imageUrl);
                                } else {
                                    // Add to list of URLs to fetch
                                    missingImageIds.push(imageId);
                                }
                            }
                        }, this);
                    }
                    
                    // Generate gallery field HTML
                    fieldInput = this.templates.gallery
                        .replace(/{field_name}/g, fieldName)
                        .replace(/{field_value}/g, JSON.stringify(galleryValues))
                        .replace(/{gallery_items}/g, galleryItemsHtml);
                        
                    // If we have missing image URLs, fetch them after rendering
                    if (missingImageIds.length > 0) {
                        // Use a setTimeout to ensure the field is rendered before making the AJAX call
                        setTimeout(function() {
                            this.fetchGalleryImageData(fieldName, missingImageIds);
                        }.bind(this), 100);
                    }
                    break;
                    
                case 'taxonomy':
                    // Build the taxonomy items HTML
                    var taxonomyItemsHtml = '';
                    var taxonomyValues = Array.isArray(fieldData.value) ? fieldData.value : [];
                    var hierarchical = fieldData.hierarchical || false;
                    
                    // Sort the options to put parent items before children
                    var options = fieldData.options || [];
                    
                    // If hierarchical, organize terms by parent
                    if (hierarchical) {
                        // Build a hierarchy structure
                        var termsByParent = {};
                        options.forEach(function(term) {
                            if (!termsByParent[term.parent]) {
                                termsByParent[term.parent] = [];
                            }
                            termsByParent[term.parent].push(term);
                        });
                        
                        // Build HTML for hierarchical terms
                        taxonomyItemsHtml = this.buildHierarchicalTermsHtml(termsByParent, 0, 0, taxonomyValues, fieldData.taxonomy);
                    } else {
                        // Flat list for non-hierarchical taxonomies like tags
                        options.forEach(function(term) {
                            var checked = taxonomyValues.indexOf(term.value) !== -1 ? 'checked' : '';
                            var inputType = hierarchical ? 'checkbox' : 'checkbox';
                            
                            taxonomyItemsHtml += this.templates.taxonomyItem
                                .replace(/{indent}/g, 0)
                                .replace(/{input_type}/g, inputType)
                                .replace(/{taxonomy}/g, fieldData.taxonomy)
                                .replace(/{term_id}/g, term.value)
                                .replace(/{checked}/g, checked)
                                .replace(/{term_name}/g, term.label)
                                .replace(/{term_count}/g, term.count || 0);
                        }, this);
                    }
                    
                    // Create the taxonomy field HTML
                    fieldInput = this.templates.taxonomy
                        .replace(/{field_name}/g, fieldName)
                        .replace(/{taxonomy}/g, fieldData.taxonomy)
                        .replace(/{hierarchical}/g, hierarchical ? 'true' : 'false')
                        .replace(/{taxonomy_items}/g, taxonomyItemsHtml)
                        .replace(/{field_value}/g, JSON.stringify(taxonomyValues));
                    break;
                    
                case 'relationship':
                case 'post_object':
                    // Get available and selected posts
                    var postOptions = fieldData.post_options || [];
                    var selectedValues = Array.isArray(fieldData.value) ? fieldData.value : (fieldData.value ? [fieldData.value] : []);
                    var max = fieldData.max || 0;
                    var min = fieldData.min || 0;
                    var multiple = fieldData.multiple || fieldData.type === 'relationship';
                    
                    // Prepare available items HTML
                    var availableItemsHtml = '';
                    var selectedItemsHtml = '';
                    
                    // Loop through post options to create available and selected items
                    postOptions.forEach(function(post) {
                        var isSelected = false;
                        
                        // Check if post is selected
                        if (Array.isArray(selectedValues)) {
                            // For arrays, check if the post ID is in the array
                            isSelected = selectedValues.indexOf(post.id) !== -1;
                        } else if (typeof selectedValues === 'object' && selectedValues !== null) {
                            // For object values (ACF sometimes returns objects)
                            isSelected = selectedValues.id === post.id;
                        } else {
                            // For single values
                            isSelected = selectedValues == post.id;
                        }
                        
                        // Only show in available list if not selected
                        if (!isSelected) {
                            availableItemsHtml += this.templates.relationshipItem
                                .replace(/{post_id}/g, post.id)
                                .replace(/{post_title}/g, post.title)
                                .replace(/{post_type}/g, post.type)
                                .replace(/{post_date}/g, post.date || '')
                                .replace(/{button_type}/g, 'add')
                                .replace(/{button_icon}/g, 'plus');
                        } else {
                            // Add to selected items
                            selectedItemsHtml += this.templates.relationshipItem
                                .replace(/{post_id}/g, post.id)
                                .replace(/{post_title}/g, post.title)
                                .replace(/{post_type}/g, post.type)
                                .replace(/{post_date}/g, post.date || '')
                                .replace(/{button_type}/g, 'remove')
                                .replace(/{button_icon}/g, 'minus');
                        }
                    }, this);
                    
                    // Create the relationship field HTML
                    fieldInput = this.templates.relationship
                        .replace(/{field_name}/g, fieldName)
                        .replace(/{field_value}/g, JSON.stringify(selectedValues))
                        .replace(/{available_items}/g, availableItemsHtml)
                        .replace(/{selected_items}/g, selectedItemsHtml)
                        .replace(/{max}/g, max)
                        .replace(/{min}/g, min)
                        .replace(/{multiple}/g, multiple ? 'true' : 'false');
                    break;
                    
                default:
                    // For unsupported field types
                    fieldInput = '<p>' + (wpfe_data.i18n.unsupported_field || 'This field type is not supported yet.') + '</p>';
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
                    var self = this;
                    
                    // Check if editor already exists to avoid duplicate initialization
                    if (window.tinymce && window.tinymce.get(id)) {
                        return;
                    }
                    
                    wp.editor.initialize(id, {
                        tinymce: {
                            wpautop: true,
                            plugins: 'charmap colorpicker hr lists paste tabfocus textcolor fullscreen wordpress wpautoresize wpeditimage wpemoji wpgallery wplink wptextpattern',
                            toolbar1: 'formatselect bold italic bullist numlist blockquote alignleft aligncenter alignright link unlink wp_more fullscreen',
                            toolbar2: '',
                            height: 200,
                            setup: function(editor) {
                                // Update field value on content change
                                editor.on('change', function() {
                                    // Sync the editor content to the textarea
                                    editor.save();
                                    
                                    // If live preview is enabled, update the preview
                                    if (wpfe_data.live_preview) {
                                        var content = editor.getContent();
                                        var fieldName = $('#' + id).closest('.wpfe-editor-field').data('field-name');
                                        var $element = $('[data-wpfe-field="' + fieldName + '"]');
                                        
                                        if ($element.length) {
                                            // Update the content in the page
                                            $element.contents().not('.wpfe-edit-button').remove();
                                            // Use the correct rendering for content
                                            $element.prepend(content);
                                        }
                                    }
                                });
                            }
                        },
                        quicktags: {
                            buttons: 'strong,em,link,block,del,ins,img,ul,ol,li,code,close'
                        },
                        mediaButtons: true
                    });
                });
            } else {
                // Fallback for environments where wp.editor is not available
                $('.wpfe-editor-wysiwyg').each(function() {
                    $(this).css({
                        'width': '100%',
                        'min-height': '200px'
                    });
                });
            }
        },
        
        /**
         * Initialize taxonomy fields with search and selection behavior
         */
        initTaxonomyFields: function() {
            var self = this;
            
            // Handle taxonomy search
            $(document).on('input', '.wpfe-taxonomy-search-input', function() {
                var $field = $(this).closest('.wpfe-editor-taxonomy-field');
                var searchText = $(this).val().toLowerCase();
                
                // If empty search, show all items
                if (!searchText) {
                    $field.find('.wpfe-taxonomy-item').show();
                    return;
                }
                
                // Filter items based on search text
                $field.find('.wpfe-taxonomy-item').each(function() {
                    var termName = $(this).find('label').text().toLowerCase();
                    if (termName.indexOf(searchText) !== -1) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            });
            
            // Handle checkbox changes to update the hidden input value
            $(document).on('change', '.wpfe-taxonomy-checkbox', function() {
                var $field = $(this).closest('.wpfe-editor-taxonomy-field');
                var $hiddenInput = $field.find('input[type="hidden"]');
                var selectedValues = [];
                
                // Get all checked checkboxes
                $field.find('.wpfe-taxonomy-checkbox:checked').each(function() {
                    selectedValues.push(parseInt($(this).val(), 10));
                });
                
                // Update the hidden input value
                $hiddenInput.val(JSON.stringify(selectedValues));
                
                // If live preview is enabled, update the display
                if (wpfe_data.live_preview) {
                    // Implementation would depend on how taxonomies are displayed in the theme
                    // This is a simple approach - in practice, you might want to refresh the category/tag list display
                }
            });
            
            // Initialize relationship fields
            this.initRelationshipFields();
            
            // Initialize gallery fields
            this.initGalleryFields();
        },
        
        /**
         * Initialize relationship fields with search and selection functionality
         */
        initRelationshipFields: function() {
            var self = this;
            
            // Handle relationship field search
            $(document).on('input', '.wpfe-relationship-search-input', function() {
                var $field = $(this).closest('.wpfe-editor-relationship-field');
                var searchText = $(this).val().toLowerCase();
                
                // If empty search, show all items
                if (!searchText) {
                    $field.find('.wpfe-relationship-available-items .wpfe-relationship-item').show();
                    return;
                }
                
                // Filter items based on search text
                $field.find('.wpfe-relationship-available-items .wpfe-relationship-item').each(function() {
                    var itemText = $(this).find('.wpfe-relationship-item-title').text().toLowerCase();
                    if (itemText.indexOf(searchText) !== -1) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            });
            
            // Handle relationship add button click
            $(document).on('click', '.wpfe-relationship-add-button', function() {
                var $item = $(this).closest('.wpfe-relationship-item');
                var postId = $item.data('id');
                var $field = $(this).closest('.wpfe-editor-relationship-field');
                var $selectedContainer = $field.find('.wpfe-relationship-selected-items');
                var $hiddenInput = $field.find('input[type="hidden"]');
                var multiple = $field.data('multiple') === true;
                var maxItems = parseInt($field.data('max'), 10) || 0;
                
                // Check if we've hit the maximum number of items (if set)
                if (maxItems > 0) {
                    var currentCount = $selectedContainer.find('.wpfe-relationship-item').length;
                    if (currentCount >= maxItems) {
                        alert('Maximum number of items selected (' + maxItems + ')');
                        return;
                    }
                }
                
                // Clone the item and change button to remove
                var $clonedItem = $item.clone();
                $clonedItem.find('.wpfe-relationship-add-button')
                    .removeClass('wpfe-relationship-add-button')
                    .addClass('wpfe-relationship-remove-button')
                    .find('.dashicons')
                    .removeClass('dashicons-plus')
                    .addClass('dashicons-minus');
                
                // Add to selected container
                $selectedContainer.append($clonedItem);
                
                // If not multiple, hide the original item
                if (!multiple) {
                    $item.hide();
                }
                
                // Update the hidden input with selected values
                self.updateRelationshipValues($field);
            });
            
            // Handle relationship remove button click
            $(document).on('click', '.wpfe-relationship-remove-button', function() {
                var $item = $(this).closest('.wpfe-relationship-item');
                var postId = $item.data('id');
                var $field = $(this).closest('.wpfe-editor-relationship-field');
                var multiple = $field.data('multiple') === true;
                
                // Remove the item
                $item.remove();
                
                // If not multiple, show the original item again
                if (!multiple) {
                    $field.find('.wpfe-relationship-available-items .wpfe-relationship-item[data-id="' + postId + '"]').show();
                }
                
                // Update the hidden input with selected values
                self.updateRelationshipValues($field);
            });
            
            // Initialize sortable for relationship selected items (jQuery UI sortable)
            if ($.fn.sortable) {
                // Only initialize if there are relationship items
                var $relationshipContainers = $('.wpfe-relationship-selected-items');
                if ($relationshipContainers.length > 0) {
                    try {
                        $relationshipContainers.sortable({
                            update: function(event, ui) {
                                // Update values when items are reordered
                                var $field = $(this).closest('.wpfe-editor-relationship-field');
                                self.updateRelationshipValues($field);
                            },
                            placeholder: 'wpfe-relationship-sortable-placeholder',
                            forcePlaceholderSize: true,
                            cancel: 'button' // Prevent starting drag on buttons
                        });
                    } catch (e) {
                        if (wpfe_data.debug_mode) {
                            console.error('Error initializing sortable for relationship fields:', e);
                        }
                    }
                }
            }
        },
        
        /**
         * Initialize gallery fields with sorting and add/remove functionality
         */
        initGalleryFields: function() {
            var self = this;
            
            // Initialize sortable for gallery items
            if ($.fn.sortable) {
                // Only initialize sortable if gallery items exist
                var $galleries = $('.wpfe-sortable-gallery');
                if ($galleries.length > 0) {
                    try {
                        $galleries.sortable({
                            placeholder: 'wpfe-gallery-placeholder',
                            forcePlaceholderSize: true,
                            tolerance: 'pointer',
                            cursor: 'move',
                            update: function(event, ui) {
                                // Update the hidden input with the new order
                                var $gallery = $(this);
                                var $field = $gallery.closest('.wpfe-editor-gallery-field');
                                self.updateGalleryValues($field);
                            }
                        });
                    } catch (e) {
                        if (wpfe_data.debug_mode) {
                            console.error('Error initializing sortable for galleries:', e);
                        }
                    }
                }
            }
            
            // Handle add images button click
            $(document).on('click', '.wpfe-gallery-add', function() {
                var $field = $(this).closest('.wpfe-editor-gallery-field');
                var fieldName = $field.find('input[type="hidden"]').attr('name');
                
                self.openGalleryMedia(fieldName);
            });
            
            // Handle remove image button click
            $(document).on('click', '.wpfe-gallery-item-remove', function() {
                var $item = $(this).closest('.wpfe-gallery-item');
                var $field = $item.closest('.wpfe-editor-gallery-field');
                
                // Remove the item
                $item.remove();
                
                // Update gallery values
                self.updateGalleryValues($field);
            });
        },
        
        /**
         * Fetch gallery image data for images that don't have URLs
         * 
         * @param {string} fieldName The field name
         * @param {Array} imageIds Array of image IDs to fetch
         */
        fetchGalleryImageData: function(fieldName, imageIds) {
            var self = this;
            
            if (!imageIds || !imageIds.length) {
                return;
            }
            
            // Make AJAX request to get image data
            $.ajax({
                url: wpfe_data.ajax_url,
                method: 'GET',
                data: {
                    action: 'wpfe_get_gallery_data',
                    nonce: wpfe_data.nonce,
                    attachment_ids: JSON.stringify(imageIds)
                },
                success: function(response) {
                    if (response.success && response.data.images) {
                        var $field = $('.wpfe-editor-field[data-field-name="' + fieldName + '"]');
                        var $gallery = $field.find('.wpfe-gallery-preview');
                        
                        // Process each image
                        response.data.images.forEach(function(image) {
                            // Check if we already have this image in the gallery
                            var $existingItem = $gallery.find('.wpfe-gallery-item[data-id="' + image.id + '"]');
                            
                            if ($existingItem.length === 0) {
                                // Create new gallery item
                                var itemHtml = self.templates.galleryItem
                                    .replace(/{image_id}/g, image.id)
                                    .replace(/{image_url}/g, image.thumbnail_url);
                                
                                $gallery.append(itemHtml);
                            } else {
                                // Update existing item
                                $existingItem.find('img').attr('src', image.thumbnail_url);
                            }
                        });
                        
                        // If sortable is available, refresh it
                        if ($.fn.sortable && $gallery.hasClass('ui-sortable')) {
                            $gallery.sortable('refresh');
                        }
                    }
                },
                error: function() {
                    if (wpfe_data.debug_mode) {
                        console.error('Failed to fetch gallery image data for field:', fieldName);
                    }
                }
            });
        },
        
        /**
         * Open the WordPress media library for gallery selection
         * 
         * @param {string} fieldName The field name
         */
        openGalleryMedia: function(fieldName) {
            var self = this;
            
            // Get current gallery values
            var $field = $('.wpfe-editor-gallery-field').filter(function() {
                return $(this).find('input[type="hidden"]').attr('name') === fieldName;
            });
            
            var $hiddenInput = $field.find('input[type="hidden"]');
            var currentValue = $hiddenInput.val();
            var currentSelection = [];
            
            // Parse current value
            try {
                currentSelection = JSON.parse(currentValue);
                if (!Array.isArray(currentSelection)) {
                    currentSelection = [];
                }
            } catch (e) {
                currentSelection = [];
            }
            
            // Create the media frame
            var galleryFrame = wp.media({
                title: wpfe_data.i18n.select_gallery_images || 'Select Gallery Images',
                multiple: true,
                library: {
                    type: 'image'
                },
                button: {
                    text: wpfe_data.i18n.add_to_gallery || 'Add to Gallery'
                }
            });
            
            // Set selected images if we have current values
            if (currentSelection.length > 0 && galleryFrame.state().get('selection')) {
                var selection = galleryFrame.state().get('selection');
                
                currentSelection.forEach(function(attachmentId) {
                    var attachment = wp.media.attachment(attachmentId);
                    attachment.fetch();
                    selection.add(attachment ? [attachment] : []);
                });
            }
            
            // When images are selected
            galleryFrame.on('select', function() {
                var selection = galleryFrame.state().get('selection');
                var $galleryPreview = $field.find('.wpfe-gallery-preview');
                var newGalleryItems = [];
                
                // Clear existing items if replacing the gallery
                if (!wpfe_data.gallery_append) {
                    $galleryPreview.empty();
                    newGalleryItems = [];
                } else {
                    // Get existing IDs if appending
                    $galleryPreview.find('.wpfe-gallery-item').each(function() {
                        newGalleryItems.push(parseInt($(this).data('id'), 10));
                    });
                }
                
                // Add selected images
                selection.forEach(function(attachment) {
                    attachment = attachment.toJSON();
                    
                    // Skip if image already exists in gallery
                    if (newGalleryItems.indexOf(attachment.id) !== -1) {
                        return;
                    }
                    
                    // Add image ID to array
                    newGalleryItems.push(attachment.id);
                    
                    // Create gallery item element
                    var itemHtml = self.templates.galleryItem
                        .replace(/{image_id}/g, attachment.id)
                        .replace(/{image_url}/g, attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url);
                    
                    // Append to gallery preview
                    $galleryPreview.append(itemHtml);
                });
                
                // Update the hidden input value
                $hiddenInput.val(JSON.stringify(newGalleryItems));
            });
            
            // Open the media library
            galleryFrame.open();
        },
        
        /**
         * Update the hidden input with the current gallery items
         * 
         * @param {jQuery} $field The gallery field container
         */
        updateGalleryValues: function($field) {
            var $galleryItems = $field.find('.wpfe-gallery-item');
            var $hiddenInput = $field.find('input[type="hidden"]');
            var galleryValues = [];
            
            // Get all gallery item IDs in the current order
            $galleryItems.each(function() {
                galleryValues.push(parseInt($(this).data('id'), 10));
            });
            
            // Update the hidden input
            $hiddenInput.val(JSON.stringify(galleryValues));
            
            // If live preview is enabled, try to update the display
            if (wpfe_data.live_preview) {
                var fieldName = $field.closest('.wpfe-editor-field').data('field-name');
                var $element = $('[data-wpfe-field="' + fieldName + '"]');
                
                if ($element.length) {
                    // Simply reorder the existing gallery images if possible
                    var $galleryContainer = $element.find('.gallery, .wp-block-gallery, .acf-gallery');
                    
                    if ($galleryContainer.length) {
                        var $items = $galleryContainer.find('.gallery-item, .blocks-gallery-item, .acf-gallery-attachment');
                        
                        // Only try to reorder if we have the same number of items
                        if ($items.length === galleryValues.length) {
                            var $reorderedItems = $();
                            
                            // Reorder based on the new order
                            galleryValues.forEach(function(id) {
                                var $item = $items.filter(function() {
                                    return $(this).find('img').data('id') == id || 
                                           $(this).data('id') == id ||
                                           $(this).find('img').attr('data-attachment-id') == id;
                                });
                                
                                if ($item.length) {
                                    $reorderedItems = $reorderedItems.add($item);
                                }
                            });
                            
                            // Replace with reordered items if we found matches for all
                            if ($reorderedItems.length === $items.length) {
                                $items.detach();
                                $galleryContainer.append($reorderedItems);
                            }
                        }
                    }
                }
            }
        },
        
        /**
         * Update the hidden input with the current selection of relationship items
         * 
         * @param {jQuery} $field The relationship field container
         */
        updateRelationshipValues: function($field) {
            var $hiddenInput = $field.find('input[type="hidden"]');
            var selectedValues = [];
            var multiple = $field.data('multiple') === true;
            
            // Get all selected item IDs
            $field.find('.wpfe-relationship-selected-items .wpfe-relationship-item').each(function() {
                selectedValues.push(parseInt($(this).data('id'), 10));
            });
            
            // If not multiple and we have a value, just use the first one
            if (!multiple && selectedValues.length > 0) {
                $hiddenInput.val(selectedValues[0]);
            } else {
                // Otherwise set the JSON array
                $hiddenInput.val(JSON.stringify(selectedValues));
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
                        
                    case 'taxonomy':
                        // Parse the JSON stored in the hidden input
                        var taxValue = $('#wpfe-field-' + fieldName).val();
                        try {
                            value = JSON.parse(taxValue);
                        } catch (e) {
                            value = [];
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
                        // Also update page title
                        document.title = value + ' - ' + document.title.split(' - ').pop();
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
                        // Update featured image without page reload
                        if (value) {
                            // Find featured image elements - common selectors across themes
                            var $featuredImg = $('.post-thumbnail img, .wp-post-image, .attachment-post-thumbnail, article img.attachment-thumbnail');
                            if ($featuredImg.length) {
                                // Get the image data via AJAX
                                $.ajax({
                                    url: wpfe_data.ajax_url,
                                    method: 'GET',
                                    data: {
                                        action: 'wpfe_get_image_data',
                                        nonce: wpfe_data.nonce,
                                        attachment_id: value
                                    },
                                    success: function(response) {
                                        if (response.success && response.data.url) {
                                            // Update all featured image instances
                                            $featuredImg.each(function() {
                                                $(this).attr('src', response.data.url);
                                                // Also update srcset if it exists
                                                if (response.data.srcset) {
                                                    $(this).attr('srcset', response.data.srcset);
                                                }
                                            });
                                        }
                                    }
                                });
                            } else {
                                // If we can't find the featured image element, fall back to reload
                                location.reload();
                            }
                        } else {
                            // Image was removed, try to remove it from DOM
                            $('.post-thumbnail img, .wp-post-image, .attachment-post-thumbnail').remove();
                        }
                        break;
                        
                    default:
                        // Handle ACF fields
                        $element = $('[data-wpfe-field="' + fieldName + '"]');
                        if ($element.length) {
                            var fieldType = self.fields[fieldName] ? self.fields[fieldName].type : '';
                            
                            if (fieldType === 'repeater' || fieldType === 'flexible_content') {
                                // For complex fields, try AJAX refresh first
                                $.ajax({
                                    url: wpfe_data.ajax_url,
                                    method: 'GET',
                                    data: {
                                        action: 'wpfe_get_rendered_field',
                                        nonce: wpfe_data.nonce,
                                        post_id: self.activePostId,
                                        field_name: fieldName
                                    },
                                    success: function(response) {
                                        if (response.success && response.data.html) {
                                            // Replace the old content with the new rendered content
                                            $element.contents().not('.wpfe-edit-button').remove();
                                            $element.prepend(response.data.html);
                                        } else {
                                            // Fallback to reload if AJAX refresh fails
                                            location.reload();
                                        }
                                    },
                                    error: function() {
                                        // Fallback to reload if AJAX fails
                                        location.reload();
                                    }
                                });
                            } else if (fieldType === 'image' || fieldType === 'gallery') {
                                // For image fields, try to update the src
                                var $imgs = $element.find('img');
                                if ($imgs.length && typeof value === 'object' && value.url) {
                                    // Update image src
                                    $imgs.attr('src', value.url);
                                    if (value.srcset) {
                                        $imgs.attr('srcset', value.srcset);
                                    }
                                } else if ($imgs.length && typeof value === 'number') {
                                    // Get image data and update
                                    $.ajax({
                                        url: wpfe_data.ajax_url,
                                        method: 'GET',
                                        data: {
                                            action: 'wpfe_get_image_data',
                                            nonce: wpfe_data.nonce,
                                            attachment_id: value
                                        },
                                        success: function(response) {
                                            if (response.success && response.data.url) {
                                                $imgs.attr('src', response.data.url);
                                                if (response.data.srcset) {
                                                    $imgs.attr('srcset', response.data.srcset);
                                                }
                                            } else {
                                                location.reload();
                                            }
                                        },
                                        error: function() {
                                            location.reload();
                                        }
                                    });
                                } else {
                                    // Can't update, reload
                                    location.reload();
                                }
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
                    title: wpfe_data.i18n.select_image || 'Select Image',
                    multiple: false,
                    library: {
                        type: 'image'
                    },
                    button: {
                        text: wpfe_data.i18n.select || 'Select'
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
        // Safely initialize the editor
        try {
            wpfe.init();
        } catch (e) {
            console.error('Error initializing WP Frontend Editor:', e);
        }
        
        // Add safety checks for other scripts that might depend on our editor
        // This fixes the "Cannot read properties of undefined (reading 'instance')" error
        $(window).on('load', function() {
            // Ensure jQuery UI sortable is properly initialized
            if ($.fn.sortable && $('.wpfe-sortable-gallery').length) {
                try {
                    $('.wpfe-sortable-gallery').sortable('refresh');
                } catch (e) {
                    // Ignore errors, just a safety measure
                }
            }
        });
    });

    // Expose the wpfe object globally
    window.wpfe = wpfe;

})(jQuery);