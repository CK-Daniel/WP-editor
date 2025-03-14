/**
 * WP Frontend Editor Fields Module
 * Handles field rendering and management
 */

var WPFE = WPFE || {};

WPFE.fields = (function($) {
    'use strict';
    
    // Mark this module as loaded
    WPFE.modulesReady.fields = true;
    if (WPFE.debug && WPFE.debug.modulesLoaded) {
        WPFE.debug.modulesLoaded.push('fields');
    }

    // Private variables
    var activeEditors = [];
    var pendingFieldUpdates = {};
    
    // Private functions
    /**
     * Render a standard text field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderTextField(fieldData) {
        var value = fieldData.value || '';
        
        // Use the text template from our templates
        var template = WPFE.utils.getTemplate('text', {
            value: WPFE.utils.sanitizeString(value),
            placeholder: fieldData.placeholder || '',
            label: fieldData.label || fieldData.field_name || '',
            description: fieldData.description || ''
        });
        
        return template;
    }
    
    /**
     * Render a textarea field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderTextareaField(fieldData) {
        var value = fieldData.value || '';
        
        // Use the textarea template from our templates
        var template = WPFE.utils.getTemplate('textarea', {
            value: WPFE.utils.sanitizeString(value),
            placeholder: fieldData.placeholder || '',
            label: fieldData.label || fieldData.field_name || '',
            description: fieldData.description || ''
        });
        
        return template;
    }
    
    /**
     * Render a WYSIWYG field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderWysiwygField(fieldData) {
        var value = fieldData.value || '';
        
        // Use the WYSIWYG template from our templates
        var template = WPFE.utils.getTemplate('wysiwyg', {
            value: value, // Don't sanitize HTML for WYSIWYG
            label: fieldData.label || fieldData.field_name || '',
            description: fieldData.description || ''
        });
        
        return template;
    }
    
    /**
     * Render an image field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderImageField(fieldData) {
        var value = fieldData.value || '';
        var hasImage = value && value.url;
        var imageUrl = hasImage ? value.url : '';
        var imageAlt = hasImage && value.alt ? value.alt : '';
        var imageId = hasImage && value.id ? value.id : '';
        
        // Use the image template from our templates
        var template = WPFE.utils.getTemplate('image', {
            image_url: imageUrl,
            image_alt: WPFE.utils.sanitizeString(imageAlt),
            image_id: imageId,
            label: fieldData.label || fieldData.field_name || '',
            description: fieldData.description || ''
        });
        
        return template;
    }
    
    /**
     * Render a gallery field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderGalleryField(fieldData) {
        var value = fieldData.value || [];
        var galleryItems = '';
        
        // Generate gallery items
        if (Array.isArray(value) && value.length > 0) {
            for (var i = 0; i < value.length; i++) {
                var item = value[i];
                galleryItems += WPFE.utils.getTemplate('galleryItem', {
                    image_url: item.url || '',
                    image_id: item.id || '',
                    image_alt: WPFE.utils.sanitizeString(item.alt || ''),
                    image_title: WPFE.utils.sanitizeString(item.title || ''),
                    image_index: i
                });
            }
        }
        
        // Use the gallery template from our templates
        var template = WPFE.utils.getTemplate('gallery', {
            gallery_items: galleryItems,
            label: fieldData.label || fieldData.field_name || '',
            description: fieldData.description || ''
        });
        
        return template;
    }
    
    /**
     * Initialize WYSIWYG editor for a field
     * 
     * @param {string} editorId The editor element ID
     */
    function initWysiwygEditor(editorId) {
        // Check if TinyMCE is available
        if (typeof tinymce === 'undefined' || !tinymce.get) {
            return;
        }
        
        var editorSettings = {
            selector: '#' + editorId,
            menubar: false,
            plugins: 'link lists image wordpress wplink',
            toolbar: 'formatselect bold italic | bullist numlist | link',
            height: 300,
            branding: false,
            convert_urls: false,
            relative_urls: false,
            browser_spellcheck: true,
            setup: function(editor) {
                editor.on('change', function() {
                    WPFE.events.setChangeMade(true);
                    
                    // Update preview if needed
                    var fieldName = WPFE.core.getActiveField();
                    var postId = WPFE.core.getActivePostId();
                    var $editableElement = $('[data-wpfe-field="' + fieldName + '"][data-wpfe-post-id="' + postId + '"]');
                    
                    // Only update content previews, not complex fields
                    if ($editableElement.length && (fieldName === 'post_content' || fieldName === 'content')) {
                        var content = editor.getContent();
                        updatePreview($editableElement, fieldName, content, 'wysiwyg');
                    }
                });
            }
        };
        
        // Remove any existing editor instance
        if (tinymce.get(editorId)) {
            tinymce.get(editorId).remove();
        }
        
        // Initialize editor
        tinymce.init(editorSettings);
        
        // Track active editor
        activeEditors.push(editorId);
    }
    
    /**
     * Update preview for a field in the page
     * 
     * @param {jQuery} $element The element to update
     * @param {string} fieldName The field name
     * @param {*} value The new value
     * @param {string} fieldType The field type
     */
    function updatePreview($element, fieldName, value, fieldType) {
        if (!$element || !$element.length) {
            return;
        }
        
        if (pendingFieldUpdates[fieldName]) {
            clearTimeout(pendingFieldUpdates[fieldName]);
        }
        
        // Debounce update to avoid excessive DOM updates
        pendingFieldUpdates[fieldName] = setTimeout(function() {
            // Different update strategy based on field type
            switch (fieldType) {
                case 'wysiwyg':
                case 'rich_text':
                    $element.html(value);
                    break;
                
                case 'image':
                    if (value && value.url) {
                        if ($element.is('img')) {
                            $element.attr('src', value.url);
                            if (value.alt) {
                                $element.attr('alt', value.alt);
                            }
                        } else if ($element.find('img').length === 1) {
                            $element.find('img').attr('src', value.url);
                            if (value.alt) {
                                $element.find('img').attr('alt', value.alt);
                            }
                        } else {
                            $element.html('<img src="' + value.url + '" alt="' + (value.alt || '') + '" />');
                        }
                    } else {
                        $element.html('');
                    }
                    break;
                
                case 'gallery':
                    var galleryHtml = '';
                    if (Array.isArray(value) && value.length > 0) {
                        galleryHtml = '<div class="wpfe-gallery-preview">';
                        for (var i = 0; i < value.length; i++) {
                            galleryHtml += '<img src="' + value[i].url + '" alt="' + (value[i].alt || '') + '" />';
                        }
                        galleryHtml += '</div>';
                    }
                    $element.html(galleryHtml);
                    break;
                
                case 'textarea':
                    $element.html(value.replace(/\\n/g, '<br>'));
                    break;
                
                default:
                    // For regular text fields
                    if (fieldName === 'post_title' || fieldName.indexOf('title') !== -1) {
                        $element.text(value);
                    } else {
                        $element.html(value);
                    }
            }
            
            delete pendingFieldUpdates[fieldName];
            
            // Trigger event
            $(document).trigger('wpfe:preview_updated', [$element, fieldName, value, fieldType]);
        }, 300);
    }
    
    /**
     * Update page content after saving
     * 
     * @param {Object} updatedContent Object with field names and values
     */
    function updatePageContent(updatedContent) {
        if (!updatedContent) {
            return;
        }
        
        // Update each field in the page
        for (var fieldName in updatedContent) {
            if (updatedContent.hasOwnProperty(fieldName)) {
                var value = updatedContent[fieldName];
                var $elements = $('[data-wpfe-field="' + fieldName + '"]');
                
                $elements.each(function() {
                    var $element = $(this);
                    var fieldType = $element.attr('data-wpfe-field-type') || '';
                    
                    updatePreview($element, fieldName, value, fieldType);
                });
            }
        }
    }
    
    /**
     * Initialize field-specific handlers after rendering
     * 
     * @param {string} fieldName The field name
     * @param {Object} response The AJAX response with field data
     */
    function initFieldHandlers(fieldName, response) {
        if (!response.success || !response.data) {
            return;
        }
        
        var fieldType = response.data.type || '';
        
        // Initialize specific field types
        switch (fieldType) {
            case 'wysiwyg':
            case 'rich_text':
                initWysiwygEditor('wpfe-editor-wysiwyg');
                break;
                
            case 'image':
                initImagePicker();
                break;
                
            case 'gallery':
                initGalleryHandlers();
                break;
        }
    }
    
    /**
     * Initialize image picker functionality
     */
    function initImagePicker() {
        var sidebar = WPFE.core.getSidebar();
        
        // Add click handler for the image select button
        sidebar.on('click', '.wpfe-select-image', function(e) {
            e.preventDefault();
            
            // Open WordPress media library
            openMediaLibrary(function(attachment) {
                // Update image preview
                var $imagePreview = sidebar.find('.wpfe-image-preview');
                var $imageId = sidebar.find('input[name="image_id"]');
                var $imageUrl = sidebar.find('input[name="image_url"]');
                var $imageAlt = sidebar.find('input[name="image_alt"]');
                
                $imagePreview.html('<img src="' + attachment.url + '" alt="' + (attachment.alt || '') + '" />');
                $imageId.val(attachment.id);
                $imageUrl.val(attachment.url);
                $imageAlt.val(attachment.alt || '');
                
                // Mark as changed
                WPFE.events.setChangeMade(true);
                
                // Update the preview in the page
                var fieldName = WPFE.core.getActiveField();
                var postId = WPFE.core.getActivePostId();
                var $editableElement = $('[data-wpfe-field="' + fieldName + '"][data-wpfe-post-id="' + postId + '"]');
                
                updatePreview($editableElement, fieldName, {
                    id: attachment.id,
                    url: attachment.url,
                    alt: attachment.alt || ''
                }, 'image');
            });
        });
        
        // Add click handler for the remove image button
        sidebar.on('click', '.wpfe-remove-image', function(e) {
            e.preventDefault();
            
            // Clear image
            var $imagePreview = sidebar.find('.wpfe-image-preview');
            var $imageId = sidebar.find('input[name="image_id"]');
            var $imageUrl = sidebar.find('input[name="image_url"]');
            var $imageAlt = sidebar.find('input[name="image_alt"]');
            
            $imagePreview.html('');
            $imageId.val('');
            $imageUrl.val('');
            $imageAlt.val('');
            
            // Mark as changed
            WPFE.events.setChangeMade(true);
            
            // Update the preview in the page
            var fieldName = WPFE.core.getActiveField();
            var postId = WPFE.core.getActivePostId();
            var $editableElement = $('[data-wpfe-field="' + fieldName + '"][data-wpfe-post-id="' + postId + '"]');
            
            updatePreview($editableElement, fieldName, {}, 'image');
        });
    }
    
    /**
     * Initialize gallery field handlers
     */
    function initGalleryHandlers() {
        var sidebar = WPFE.core.getSidebar();
        
        // Make gallery items sortable
        if (sidebar.find('.wpfe-gallery-items').length && $.fn.sortable) {
            sidebar.find('.wpfe-gallery-items').sortable({
                items: '.wpfe-gallery-item',
                handle: '.wpfe-gallery-item-handle',
                update: function() {
                    WPFE.events.setChangeMade(true);
                    updateGalleryValues();
                }
            });
        }
        
        // Add click handler for the add image button
        sidebar.on('click', '.wpfe-add-gallery-image', function(e) {
            e.preventDefault();
            
            // Open WordPress media library in multiple selection mode
            openGalleryMedia(function(attachments) {
                var $galleryItems = sidebar.find('.wpfe-gallery-items');
                
                // Add each attachment to the gallery
                attachments.forEach(function(attachment) {
                    var itemHtml = WPFE.utils.getTemplate('galleryItem', {
                        image_url: attachment.url,
                        image_id: attachment.id,
                        image_alt: WPFE.utils.sanitizeString(attachment.alt || ''),
                        image_title: WPFE.utils.sanitizeString(attachment.title || ''),
                        image_index: $galleryItems.children().length
                    });
                    
                    $galleryItems.append(itemHtml);
                });
                
                // Mark as changed
                WPFE.events.setChangeMade(true);
                
                // Update hidden input values
                updateGalleryValues();
            });
        });
        
        // Add click handler for removing gallery items
        sidebar.on('click', '.wpfe-gallery-item-remove', function(e) {
            e.preventDefault();
            
            $(this).closest('.wpfe-gallery-item').remove();
            
            // Mark as changed
            WPFE.events.setChangeMade(true);
            
            // Update hidden input values
            updateGalleryValues();
        });
    }
    
    /**
     * Update gallery values when items change
     */
    function updateGalleryValues() {
        var sidebar = WPFE.core.getSidebar();
        var galleryData = [];
        
        // Collect data from all gallery items
        sidebar.find('.wpfe-gallery-item').each(function() {
            var $item = $(this);
            
            galleryData.push({
                id: $item.data('image-id'),
                url: $item.data('image-url'),
                alt: $item.find('.wpfe-gallery-item-alt').val(),
                title: $item.find('.wpfe-gallery-item-title').val()
            });
        });
        
        // Store JSON data in hidden input
        sidebar.find('input[name="gallery_data"]').val(JSON.stringify(galleryData));
        
        // Update the preview in the page
        var fieldName = WPFE.core.getActiveField();
        var postId = WPFE.core.getActivePostId();
        var $editableElement = $('[data-wpfe-field="' + fieldName + '"][data-wpfe-post-id="' + postId + '"]');
        
        updatePreview($editableElement, fieldName, galleryData, 'gallery');
    }
    
    /**
     * Open WordPress media library for selecting an image
     * 
     * @param {Function} callback Callback function with the selected attachment
     */
    function openMediaLibrary(callback) {
        // Check if media frame already exists
        if (wp.media && wp.media.frames.wpfeMedia) {
            wp.media.frames.wpfeMedia.open();
            return;
        }
        
        // Create a new media frame
        wp.media.frames.wpfeMedia = wp.media({
            title: wpfe_data.i18n.select_image || 'Select Image',
            button: {
                text: wpfe_data.i18n.use_image || 'Use this image'
            },
            multiple: false,
            library: {
                type: 'image'
            }
        });
        
        // When an image is selected in the media frame...
        wp.media.frames.wpfeMedia.on('select', function() {
            // Get media attachment details from the frame state
            var attachment = wp.media.frames.wpfeMedia.state().get('selection').first().toJSON();
            
            if (typeof callback === 'function') {
                callback(attachment);
            }
        });
        
        // Open the media frame
        wp.media.frames.wpfeMedia.open();
    }
    
    /**
     * Open WordPress media library for selecting multiple images
     * 
     * @param {Function} callback Callback function with the selected attachments
     */
    function openGalleryMedia(callback) {
        // Create a new media frame
        var frame = wp.media({
            title: wpfe_data.i18n.select_images || 'Select Images',
            button: {
                text: wpfe_data.i18n.add_to_gallery || 'Add to gallery'
            },
            multiple: true,
            library: {
                type: 'image'
            }
        });
        
        // When images are selected in the media frame...
        frame.on('select', function() {
            // Get media attachment details from the frame state
            var attachments = frame.state().get('selection').map(function(attachment) {
                return attachment.toJSON();
            });
            
            if (typeof callback === 'function') {
                callback(attachments);
            }
        });
        
        // Open the media frame
        frame.open();
    }
    
    // Public API
    return {
        /**
         * Render a field in the sidebar based on field type
         * 
         * @param {string} fieldName The field name
         * @param {Object} response The AJAX response
         */
        renderField: function(fieldName, response) {
            var sidebar = WPFE.core.getSidebar();
            var sidebarContent = sidebar.find('.wpfe-sidebar-content');
            
            // Handle error responses with better user feedback
            if (!response || !response.success) {
                var errorMessage = response && response.data && response.data.message ? 
                    response.data.message : (wpfe_data.i18n.error_loading_field || 'Error loading field.');
                    
                sidebarContent.html(
                    '<div class="wpfe-error">' +
                    '<p>' + errorMessage + '</p>' +
                    '<p class="wpfe-error-details">Field: ' + WPFE.utils.escapeHTML(fieldName) + '</p>' +
                    '<button type="button" class="wpfe-close-button button">' + 
                    (wpfe_data.i18n.close || 'Close') + '</button>' +
                    '</div>'
                );
                console.error('Failed to render field:', fieldName, response);
                return;
            }
            
            // Clear previous content
            sidebarContent.empty();
            
            // Get field data
            var fieldData = response.data;
            
            // Safety check - ensure we have field data
            if (!fieldData) {
                sidebarContent.html(
                    '<div class="wpfe-error">' +
                    '<p>No field data was returned by the server</p>' +
                    '<p class="wpfe-error-details">Field: ' + WPFE.utils.escapeHTML(fieldName) + '</p>' +
                    '<button type="button" class="wpfe-close-button button">' + 
                    (wpfe_data.i18n.close || 'Close') + '</button>' +
                    '</div>'
                );
                console.error('No field data in response for:', fieldName, response);
                return;
            }
            
            // If field type is undefined, set a default and log warning
            if (!fieldData.type) {
                console.warn('Field type is undefined for field: ' + fieldName + ', using text as fallback');
                fieldData.type = 'text';
                fieldData.original_type = 'unknown';
                fieldData.description = (fieldData.description || '') + 
                    ' <span class="wpfe-field-warning">Field type could not be determined. Using text field as fallback.</span>';
            }
            
            // Handle different field sources and special cases
            var source = fieldData.source || 'wordpress';
            
            // If we have pre-rendered HTML from the server, use it directly
            if (fieldData.html) {
                sidebarContent.html(fieldData.html);
                
                // Set field type data attribute on the content wrapper
                sidebarContent.attr('data-wpfe-field-type', fieldData.type || '');
                
                // Trigger an event that the field was loaded with pre-rendered HTML
                $(document).trigger('wpfe:field_loaded', [fieldName, fieldData]);
                return;
            }
            
            // Otherwise, use the client-side rendering
            var fieldHTML = '';
            
            try {
                // Special handling for WordPress core fields
                if (source === 'wordpress' && (fieldName === 'post_title' || fieldName === 'post_content' || fieldName === 'post_excerpt')) {
                    // Force field types for WordPress core fields
                    if (fieldName === 'post_title') {
                        fieldData.type = 'text';
                    } else if (fieldName === 'post_content') {
                        fieldData.type = 'wysiwyg';
                    } else if (fieldName === 'post_excerpt') {
                        fieldData.type = 'textarea';
                    }
                    
                    // Add better labels
                    if (!fieldData.label) {
                        if (fieldName === 'post_title') {
                            fieldData.label = 'Title';
                        } else if (fieldName === 'post_content') {
                            fieldData.label = 'Content';
                        } else if (fieldName === 'post_excerpt') {
                            fieldData.label = 'Excerpt';
                        }
                    }
                }
                
                // Basic field wrapper template
                var fieldWrapper = WPFE.utils.getTemplate('field', {
                    field_name: fieldName,
                    field_content: '{field_content}'
                });
                
                // Render specific field type
                switch (fieldData.type) {
                    case 'text':
                    case 'string':
                        fieldHTML = renderTextField(fieldData);
                        break;
                        
                    case 'textarea':
                        fieldHTML = renderTextareaField(fieldData);
                        break;
                        
                    case 'wysiwyg':
                    case 'rich_text':
                        fieldHTML = renderWysiwygField(fieldData);
                        break;
                        
                    case 'image':
                        fieldHTML = renderImageField(fieldData);
                        break;
                        
                    case 'gallery':
                        fieldHTML = renderGalleryField(fieldData);
                        break;
                        
                    default:
                        // For unknown or undefined types, use text field but add a warning message
                        if (wpfe_data.debug_mode) {
                            console.log('Unknown field type:', fieldData.type, 'for field:', fieldName);
                        }
                        
                        // Handle undefined field type by setting a default
                        if (!fieldData.type) {
                            fieldData.type = 'text';
                            fieldData.description = (fieldData.description || '') + 
                                ' <span class="wpfe-field-warning">Field type is missing. Using text field as fallback.</span>';
                        } else {
                            // Add warning that this is a fallback rendering for known but unsupported type
                            fieldData.description = (fieldData.description || '') + 
                                ' <span class="wpfe-field-warning">Field type "' + 
                                WPFE.utils.escapeHTML(fieldData.type) + 
                                '" is not fully supported and is being rendered as a text field.</span>';
                        }
                        
                        fieldHTML = renderTextField(fieldData);
                }
                
                // Insert field content into wrapper
                fieldWrapper = fieldWrapper.replace('{field_content}', fieldHTML);
                
                // Set sidebar content
                sidebarContent.html(fieldWrapper);
                
                // Set field type data attribute
                sidebarContent.find('.wpfe-field-wrapper').attr('data-wpfe-field-type', fieldData.type);
                
                // If this is a placeholder field, add a visual indicator
                if (fieldData.placeholder) {
                    sidebarContent.find('.wpfe-field-wrapper').addClass('wpfe-placeholder-field');
                }
                
                // Trigger an event that the field was loaded
                $(document).trigger('wpfe:field_loaded', [fieldName, fieldData]);
            } catch (error) {
                console.error('Error rendering field:', error, fieldData);
                
                // Show error but attempt partial recovery
                sidebarContent.html(
                    '<div class="wpfe-error">' +
                    '<p>Error rendering field: ' + error.message + '</p>' +
                    '<div class="wpfe-editor-field">' +
                    '<label for="wpfe-field-fallback">' + (fieldData.label || fieldName) + '</label>' +
                    '<div class="wpfe-editor-field-input">' +
                    '<input type="text" id="wpfe-field-value" name="wpfe-field-value" value="' + 
                    (fieldData.value ? WPFE.utils.escapeHTML(fieldData.value) : '') + '">' +
                    '</div></div>' +
                    '</div>'
                );
            }
        },
        
        /**
         * Initialize handlers for a specific field type
         * 
         * @param {string} fieldName The field name
         * @param {Object} response The AJAX response
         */
        initFieldHandlers: initFieldHandlers,
        
        /**
         * Update preview for a field in the page
         * 
         * @param {jQuery} $element The element to update
         * @param {string} fieldName The field name
         * @param {*} value The new value
         * @param {string} fieldType The field type
         */
        updatePreview: updatePreview,
        
        /**
         * Update page content after saving
         * 
         * @param {Object} updatedContent Object with field names and values
         */
        updatePageContent: updatePageContent,
        
        /**
         * Get the current value of the active field
         * 
         * @param {string} fieldName The field name
         * @return {*} The field value
         */
        getFieldValue: function(fieldName) {
            var sidebar = WPFE.core.getSidebar();
            
            // Check if we're using native fields
            if (typeof WPFE.nativeFields !== 'undefined' && WPFE.nativeFields.isInitialized()) {
                // Get values from the native fields module
                return WPFE.nativeFields.getFieldValues();
            }
            
            // Otherwise, use the original field value extraction
            var fieldWrapper = sidebar.find('.wpfe-field-wrapper');
            var fieldType = fieldWrapper.attr('data-wpfe-field-type') || 'text';
            
            // Different value extraction based on field type
            switch (fieldType) {
                case 'wysiwyg':
                case 'rich_text':
                    // Get value from TinyMCE if available
                    if (typeof tinymce !== 'undefined' && tinymce.get('wpfe-editor-wysiwyg')) {
                        return tinymce.get('wpfe-editor-wysiwyg').getContent();
                    }
                    // Fallback to textarea value
                    return sidebar.find('#wpfe-editor-wysiwyg').val();
                    
                case 'image':
                    // Return object with image data
                    return {
                        id: sidebar.find('input[name="image_id"]').val(),
                        url: sidebar.find('input[name="image_url"]').val(),
                        alt: sidebar.find('input[name="image_alt"]').val()
                    };
                    
                case 'gallery':
                    // Parse the JSON data from hidden input
                    var galleryData = sidebar.find('input[name="gallery_data"]').val();
                    try {
                        return JSON.parse(galleryData) || [];
                    } catch (e) {
                        return [];
                    }
                    
                default:
                    // For simple text fields
                    return sidebar.find('#wpfe-field-value').val();
            }
        },
        
        /**
         * Open WordPress media library for selecting an image
         * 
         * @param {Function} callback Callback function with the selected attachment
         */
        openMediaLibrary: openMediaLibrary,
        
        /**
         * Open WordPress media library for selecting multiple images
         * 
         * @param {Function} callback Callback function with the selected attachments
         */
        openGalleryMedia: openGalleryMedia
    };
})(jQuery);