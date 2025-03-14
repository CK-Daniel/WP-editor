/**
 * WP Frontend Editor Native Fields Module
 * Handles native WordPress and ACF field editing in the sidebar
 */

var WPFE = WPFE || {};

WPFE.nativeFields = (function($) {
    'use strict';

    // Private variables
    var fieldData = {};
    var isInitialized = false;
    var mediaFrame = null;
    
    // Cache DOM elements to improve performance
    var $form = null;
    var $fieldElements = {};

    // Private functions
    /**
     * Initialize field-specific handlers
     * 
     * @param {Object} data The field data
     */
    function initFieldHandlers(data) {
        fieldData = data;
        
        // Handle specific field types
        switch (data.fieldType) {
            case 'image':
            case 'post_thumbnail':
                initImageField();
                break;
                
            case 'wysiwyg':
            case 'post_content':
                initWysiwygField();
                break;
                
            case 'relationship':
            case 'post_object':
                initRelationshipField();
                break;
                
            case 'gallery':
                initGalleryField();
                break;
                
            case 'taxonomy':
                initTaxonomyField();
                break;
            
            // Add handlers for other field types as needed
        }
        
        // Track changes in all fields
        $('.wpfe-native-field-editor input, .wpfe-native-field-editor textarea, .wpfe-native-field-editor select').on('change input', function() {
            markFieldAsChanged();
        });
        
        isInitialized = true;
    }
    
    /**
     * Initialize image field handling
     */
    function initImageField() {
        // Handle image selection button
        $('.wpfe-set-thumbnail, .acf-image-uploader .acf-button').on('click', function(e) {
            e.preventDefault();
            
            // Check if the WordPress Media library is available
            if (typeof wp === 'undefined' || typeof wp.media === 'undefined') {
                console.error('WordPress Media library not available');
                
                if (typeof WPFE.ui !== 'undefined' && typeof WPFE.ui.showNotification === 'function') {
                    WPFE.ui.showNotification('Media library is not available. Please refresh the page.', 'error');
                } else {
                    alert('Media library is not available. Please refresh the page.');
                }
                return;
            }
            
            // If the media frame already exists, reopen it
            if (mediaFrame) {
                mediaFrame.open();
                return;
            }
            
            // Create a new media frame
            mediaFrame = wp.media({
                title: wpfe_data.i18n.select_image || 'Select Image',
                button: {
                    text: wpfe_data.i18n.use_image || 'Use this image'
                },
                multiple: false
            });
            
            // When an image is selected, run a callback
            mediaFrame.on('select', function() {
                var attachment = mediaFrame.state().get('selection').first().toJSON();
                
                // Update image preview and hidden input
                var $wrapper = $(e.target).closest('.wpfe-thumbnail-field, .acf-field-image');
                
                if ($wrapper.hasClass('wpfe-thumbnail-field')) {
                    // WP native field
                    $wrapper.find('.wpfe-thumbnail-preview').show().find('img').attr('src', attachment.sizes.medium ? attachment.sizes.medium.url : attachment.url);
                    $wrapper.find('input[name="post_thumbnail"]').val(attachment.id);
                    
                    // Show remove button if it exists
                    $wrapper.find('.wpfe-remove-thumbnail').show();
                } else {
                    // ACF field
                    $wrapper.find('.acf-image-uploader').addClass('has-value');
                    $wrapper.find('.acf-image-uploader img').attr('src', attachment.sizes.medium ? attachment.sizes.medium.url : attachment.url);
                    $wrapper.find('input[type="hidden"]').val(attachment.id).trigger('change');
                }
                
                markFieldAsChanged();
            });
            
            // Open the frame
            mediaFrame.open();
        });
        
        // Handle image removal
        $('.wpfe-remove-thumbnail, .acf-image-uploader .acf-icon.-cancel').on('click', function(e) {
            e.preventDefault();
            
            var $wrapper = $(this).closest('.wpfe-thumbnail-field, .acf-field-image');
            
            if ($wrapper.hasClass('wpfe-thumbnail-field')) {
                // WP native field
                $wrapper.find('.wpfe-thumbnail-preview').hide();
                $wrapper.find('input[name="post_thumbnail"]').val('');
                $(this).hide();
            } else {
                // ACF field
                $wrapper.find('.acf-image-uploader').removeClass('has-value');
                $wrapper.find('input[type="hidden"]').val('').trigger('change');
            }
            
            markFieldAsChanged();
        });
    }
    
    /**
     * Initialize WYSIWYG field handling
     */
    function initWysiwygField() {
        // Most of the WYSIWYG initialization is handled by WordPress
        // We just need to track changes
        
        if (typeof tinymce !== 'undefined') {
            // Check if editors already exist
            if (tinymce.editors && tinymce.editors.length > 0) {
                // Attach change listeners to any existing editors
                tinymce.editors.forEach(function(editor) {
                    if (editor && !editor.wpfeChangeHandlerAdded) {
                        editor.on('change', function() {
                            markFieldAsChanged();
                        });
                        editor.wpfeChangeHandlerAdded = true;
                    }
                });
            }
            
            // Also wait for any new editors to initialize
            $(document).on('tinymce-editor-init', function(event, editor) {
                if (editor && !editor.wpfeChangeHandlerAdded) {
                    // Track changes in the editor
                    editor.on('change', function() {
                        markFieldAsChanged();
                    });
                    editor.wpfeChangeHandlerAdded = true;
                }
            });
        }
        
        // Also handle changes to the textarea (for non-visual mode)
        $('.wpfe-wysiwyg-wrapper textarea').on('change input', function() {
            markFieldAsChanged();
        });
    }
    
    /**
     * Initialize relationship field handling
     */
    function initRelationshipField() {
        // ACF handles most of this internally
        // Track selection changes
        $('.acf-relationship .acf-relationship-item').on('click', function() {
            markFieldAsChanged();
        });
    }
    
    /**
     * Initialize gallery field handling
     */
    function initGalleryField() {
        // ACF handles most of this internally
        // Track add/remove changes
        $('.acf-gallery .acf-button').on('click', function() {
            markFieldAsChanged();
        });
        
        // Handle sortable items - both mouse and touch events
        $('.acf-gallery .acf-gallery-attachments').on('sortupdate sortstart sortend', function() {
            markFieldAsChanged();
        });
        
        // Explicitly handle touch events for mobile
        $('.acf-gallery-attachment').on('touchend', function() {
            setTimeout(function() {
                markFieldAsChanged();
            }, 300); // Small delay to ensure the sort has completed
        });
        
        // Initialize proper touch support for sortable if jQuery UI is available
        if ($.fn.sortable) {
            $('.acf-gallery .acf-gallery-attachments').sortable({
                tolerance: 'pointer',
                helper: 'clone',
                items: '.acf-gallery-attachment',
                forceHelperSize: true,
                forcePlaceholderSize: true,
                scroll: true,
                stop: function() {
                    markFieldAsChanged();
                }
            });
        }
    }
    
    /**
     * Initialize taxonomy field handling
     */
    function initTaxonomyField() {
        // Track checkbox/radio changes
        $('.acf-taxonomy-field input').on('change', function() {
            markFieldAsChanged();
        });
    }
    
    /**
     * Mark the current field as changed
     */
    function markFieldAsChanged() {
        $(document).trigger('wpfe:field_changed', [fieldData]);
        
        // Notify the main editor that changes have been made
        if (typeof WPFE.events !== 'undefined' && typeof WPFE.events.setChangeMade === 'function') {
            WPFE.events.setChangeMade(true);
        }
    }
    
    /**
     * Get the current field values for saving
     * 
     * @return {Object} The field values
     */
    function getFieldValues() {
        var values = {};
        
        // Make sure we have the form cached
        if (!$form) {
            $form = $('.wpfe-native-field-editor');
        }
        
        // WordPress native fields
        if (fieldData.fieldSource === 'wordpress') {
            switch (fieldData.fieldType) {
                case 'post_title':
                    // Cache field element if not already cached
                    if (!$fieldElements.post_title) {
                        $fieldElements.post_title = $form.find('input[name="post_title"]');
                    }
                    values.post_title = $fieldElements.post_title.val();
                    break;
                    
                case 'post_content':
                    // Check if we're using TinyMCE
                    if (typeof tinymce !== 'undefined' && tinymce.get('wpfe-post-content')) {
                        values.post_content = tinymce.get('wpfe-post-content').getContent();
                    } else {
                        // Cache field element if not already cached
                        if (!$fieldElements.post_content) {
                            $fieldElements.post_content = $form.find('textarea[name="post_content"]');
                        }
                        values.post_content = $fieldElements.post_content.val();
                    }
                    break;
                    
                case 'post_excerpt':
                    // Cache field element if not already cached
                    if (!$fieldElements.post_excerpt) {
                        $fieldElements.post_excerpt = $form.find('textarea[name="post_excerpt"]');
                    }
                    values.post_excerpt = $fieldElements.post_excerpt.val();
                    break;
                    
                case 'post_thumbnail':
                    // Cache field element if not already cached
                    if (!$fieldElements.post_thumbnail) {
                        $fieldElements.post_thumbnail = $form.find('input[name="post_thumbnail"]');
                    }
                    values.post_thumbnail = $fieldElements.post_thumbnail.val();
                    break;
                    
                default:
                    // Handle meta fields
                    if (fieldData.fieldName && fieldData.fieldName.indexOf('meta_') === 0) {
                        var metaKey = fieldData.fieldName.substr(5);
                        var cacheKey = 'meta_' + metaKey;
                        
                        // Cache field element if not already cached
                        if (!$fieldElements[cacheKey]) {
                            $fieldElements[cacheKey] = $form.find('input[name="meta_' + metaKey + '"], textarea[name="meta_' + metaKey + '"]');
                        }
                        
                        values[cacheKey] = $fieldElements[cacheKey].val();
                    }
            }
        }
        // ACF fields
        else if (fieldData.fieldSource === 'acf') {
            // We'll only cache the major elements, not every individual ACF field
            var $acfInputs = $form.find('input[name^="acf"], textarea[name^="acf"], select[name^="acf"]');
            
            $acfInputs.each(function() {
                var $input = $(this);
                var name = $input.attr('name');
                var value = $input.val();
                
                // Special handling for checkboxes and radio buttons
                if (($input.attr('type') === 'checkbox' || $input.attr('type') === 'radio') && !$input.is(':checked')) {
                    return;
                }
                
                values[name] = value;
            });
            
            // Add the field key for identification if available
            if (fieldData.fieldName) {
                values.acf_field_key = fieldData.fieldName;
            }
        }
        
        return values;
    }
    
    // Public API
    return {
        /**
         * Initialize the native fields module
         */
        init: function() {
            // Listen for when a native field is ready
            $(document).on('wpfe:native_field_ready', function(e, data) {
                // Reset our element cache when a new field loads
                $form = $('.wpfe-native-field-editor');
                $fieldElements = {};
            
                // Initialize the field handlers
                initFieldHandlers(data);
            });
            
            // Reset module on editor close
            $(document).on('wpfe:editor_closed', function() {
                // Clear caches to prevent memory leaks
                $form = null;
                $fieldElements = {};
                fieldData = {};
                isInitialized = false;
            });
        },
        
        /**
         * Get the current field values for saving
         * 
         * @return {Object} The field values
         */
        getFieldValues: getFieldValues,
        
        /**
         * Get current field data
         * 
         * @return {Object} The field data
         */
        getFieldData: function() {
            return fieldData;
        },
        
        /**
         * Check if the module is initialized
         * 
         * @return {boolean} Whether the module is initialized
         */
        isInitialized: function() {
            return isInitialized;
        }
    };
})(jQuery);

// Initialize the module
jQuery(document).ready(function($) {
    WPFE.nativeFields.init();
});