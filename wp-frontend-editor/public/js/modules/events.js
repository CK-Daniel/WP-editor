/**
 * WP Frontend Editor Events Module
 * Handles all event bindings and interactions
 */

var WPFE = WPFE || {};

WPFE.events = (function($) {
    'use strict';

    // Private variables
    var activeField = null;
    var activePostId = null;
    var fieldEditing = false;
    var changeMade = false;
    var userIsActive = true;
    var mouseX = 0;
    var mouseY = 0;
    var touchStartX = 0;
    var touchStartY = 0;
    var touchEndX = 0;
    var touchEndY = 0;
    var touchTimeout = null;
    var overlayActive = false;
    var historyStack = [];

    // Private functions
    /**
     * Open the editor sidebar for a specific field.
     * 
     * @param {string} fieldName The field name to edit.
     * @param {number} postId The post ID.
     */
    function openEditor(fieldName, postId) {
        // Check if editor is already open
        if (WPFE.core.isEditingActive()) {
            return false;
        }
        
        // Update state
        WPFE.core.setEditingState(true);
        WPFE.core.setActiveField(fieldName);
        WPFE.core.setActivePostId(postId);
        
        // Get sidebar and overlay elements
        var sidebar = WPFE.core.getSidebar();
        var overlay = WPFE.core.getOverlay();
        
        // Show overlay
        overlay.fadeIn(200);
        overlayActive = true;
        
        // Add active class to body
        $('body').addClass('wpfe-editor-active');
        
        // Adjust sidebar position for mobile
        if ($(window).width() < 768) {
            sidebar.css({
                'bottom': '0',
                'right': '0',
                'top': 'auto',
                'height': '80%',
                'width': '100%'
            });
        }
        
        // Show the sidebar with animation
        sidebar.addClass('wpfe-sidebar-active').css('display', 'flex');
        
        // Set sidebar title
        sidebar.find('.wpfe-sidebar-title').text(WPFE.utils.formatString(wpfe_data.i18n.editing_field || 'Editing: {0}', fieldName));
        
        // Show loading state
        sidebar.find('.wpfe-sidebar-content').html('<div class="wpfe-loading"><span class="dashicons dashicons-update-alt"></span> ' + (wpfe_data.i18n.loading || 'Loading...') + '</div>');
        
        // Fetch field data
        WPFE.ajax.fetchField(fieldName, postId, function(response) {
            // Store original values for tracking changes
            if (response.success && response.data) {
                WPFE.core.setOriginalValue(fieldName, response.data.value);
            }
            
            // Render field in the sidebar
            WPFE.fields.renderField(fieldName, response);
            
            // Initialize field-specific handlers
            WPFE.fields.initFieldHandlers(fieldName, response);
            
            // Focus the first input
            setTimeout(function() {
                sidebar.find('input:visible, textarea:visible').first().focus();
            }, 100);
            
            // Add active class to the element being edited
            var $editableElement = $('[data-wpfe-field="' + fieldName + '"][data-wpfe-post-id="' + postId + '"]');
            $editableElement.addClass('wpfe-currently-editing');
            
            // Track this edit in history
            trackFieldEdit(fieldName, postId);
        });
        
        return true;
    }

    /**
     * Close the editor sidebar and cleanup.
     * 
     * @param {boolean} saveChanges Whether to save changes before closing.
     */
    function closeEditor(saveChanges) {
        if (!WPFE.core.isEditingActive()) {
            return;
        }
        
        var sidebar = WPFE.core.getSidebar();
        var overlay = WPFE.core.getOverlay();
        var activeField = WPFE.core.getActiveField();
        var activePostId = WPFE.core.getActivePostId();
        
        // Prompt user if there are unsaved changes
        if (saveChanges === undefined && changeMade) {
            if (confirm(wpfe_data.i18n.unsaved_changes || 'You have unsaved changes. Do you want to save them?')) {
                saveChanges = true;
            } else {
                saveChanges = false;
            }
        }
        
        // Save changes if requested
        if (saveChanges) {
            WPFE.ajax.saveChanges();
        } else {
            // Revert any changes to original values
            var $editableElement = $('[data-wpfe-field="' + activeField + '"][data-wpfe-post-id="' + activePostId + '"]');
            
            // If field type has a preview update, call the reverter function
            var fieldType = $editableElement.attr('data-wpfe-field-type') || '';
            
            // Restore original content if available
            var originalValues = WPFE.core.getOriginalValues();
            if (originalValues[activeField]) {
                WPFE.fields.updatePreview($editableElement, activeField, originalValues[activeField], fieldType);
            }
        }
        
        // Reset active classes
        $('body').removeClass('wpfe-editor-active');
        $('.wpfe-currently-editing').removeClass('wpfe-currently-editing');
        
        // Hide sidebar with animation
        sidebar.removeClass('wpfe-sidebar-active');
        setTimeout(function() {
            sidebar.hide();
        }, 300);
        
        // Hide overlay
        overlay.fadeOut(200);
        overlayActive = false;
        
        // Reset state
        WPFE.core.setEditingState(false);
        WPFE.core.setActiveField(null);
        WPFE.core.setActivePostId(null);
        changeMade = false;
        
        // Clear Tiny MCE editor instances if present
        if (typeof tinymce !== 'undefined') {
            var editorId = 'wpfe-editor-wysiwyg';
            if (tinymce.get(editorId)) {
                tinymce.get(editorId).remove();
            }
        }
        
        // Trigger event
        $(document).trigger('wpfe:editor_closed');
    }

    /**
     * Track field edits in history stack
     * 
     * @param {string} fieldName The field being edited
     * @param {number} postId The post ID
     */
    function trackFieldEdit(fieldName, postId) {
        var now = new Date();
        historyStack.push({
            field: fieldName,
            post: postId,
            time: now.getTime()
        });
        
        // Limit history size
        if (historyStack.length > 20) {
            historyStack.shift();
        }
    }

    /**
     * Initialize keyboard shortcuts
     */
    function initKeyboardShortcuts() {
        $(document).on('keydown', function(e) {
            // Only process if user is editing
            if (!WPFE.core.isEditingActive()) {
                return;
            }
            
            // Escape key to close editor
            if (e.keyCode === 27) { // ESC key
                closeEditor(false);
                e.preventDefault();
            }
            
            // Ctrl+S / Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 83) { // Ctrl/Cmd + S
                WPFE.ajax.saveChanges();
                closeEditor(true);
                e.preventDefault();
            }
        });
    }

    // Public API
    return {
        /**
         * Initialize the events handling.
         */
        init: function() {
            var self = this;
            
            // Initialize event tracking variables
            var sidebar = WPFE.core.getSidebar();
            var overlay = WPFE.core.getOverlay();
            var editButtons = WPFE.core.getEditButtons();
            
            // Track mouse position for positioning
            $(document).on('mousemove', function(e) {
                mouseX = e.pageX;
                mouseY = e.pageY;
            });
            
            // Edit button click
            $(document).on('click', '.wpfe-edit-button', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var $button = $(this);
                var fieldName = $button.data('wpfe-field');
                var postId = $button.data('wpfe-post-id');
                
                openEditor(fieldName, postId);
            });
            
            // Close button click
            sidebar.on('click', '.wpfe-close-button', function(e) {
                e.preventDefault();
                closeEditor();
            });
            
            // Save button click
            sidebar.on('click', '.wpfe-save-button', function(e) {
                e.preventDefault();
                WPFE.ajax.saveChanges();
                closeEditor(true);
            });
            
            // Overlay click to close
            overlay.on('click', function(e) {
                // Only close if clicked directly on the overlay, not on its children
                if (e.target === overlay[0]) {
                    closeEditor();
                }
            });
            
            // Field change events
            sidebar.on('change input', 'input, textarea, select', function() {
                changeMade = true;
                
                // Update the preview if this is a simple field
                var $input = $(this);
                var fieldName = WPFE.core.getActiveField();
                var fieldType = $input.closest('[data-wpfe-field-type]').data('wpfe-field-type') || '';
                
                // Only update preview for simple inputs that aren't part of complex fields
                if ($input.attr('id') === 'wpfe-field-value' && 
                    !$input.closest('.wpfe-complex-field').length) {
                    
                    var value = $input.val();
                    var $editableElement = $('[data-wpfe-field="' + fieldName + '"][data-wpfe-post-id="' + WPFE.core.getActivePostId() + '"]');
                    
                    // Update the preview with the new value
                    WPFE.fields.updatePreview($editableElement, fieldName, value, fieldType);
                }
            });
            
            // Track TinyMCE changes
            $(document).on('tinymce-editor-init', function(event, editor) {
                if (editor.id.indexOf('wpfe-editor') === 0) {
                    editor.on('change', function() {
                        changeMade = true;
                    });
                }
            });
            
            // Initialize keyboard shortcuts
            initKeyboardShortcuts();
            
            // Track user activity
            $(document).on('mousemove keydown click', function() {
                userIsActive = true;
            });
            
            // Handle touch events for better mobile support
            $(document).on('touchstart', function(e) {
                if (e.originalEvent.touches && e.originalEvent.touches.length) {
                    touchStartX = e.originalEvent.touches[0].pageX;
                    touchStartY = e.originalEvent.touches[0].pageY;
                    
                    // Clear any existing timeout
                    if (touchTimeout) {
                        clearTimeout(touchTimeout);
                    }
                    
                    // Set a timeout to detect long press
                    touchTimeout = setTimeout(function() {
                        // Check if touch hasn't moved significantly (long press)
                        var target = $(e.target).closest('.wpfe-editable');
                        if (target.length && !overlayActive) {
                            var fieldName = target.data('wpfe-field');
                            var postId = target.data('wpfe-post-id');
                            
                            if (fieldName && postId) {
                                openEditor(fieldName, postId);
                            }
                        }
                    }, 800);
                }
            });
            
            $(document).on('touchend', function(e) {
                if (touchTimeout) {
                    clearTimeout(touchTimeout);
                }
                
                if (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length) {
                    touchEndX = e.originalEvent.changedTouches[0].pageX;
                    touchEndY = e.originalEvent.changedTouches[0].pageY;
                }
            });
            
            $(document).on('touchmove', function() {
                // Cancel long press detection on move
                if (touchTimeout) {
                    clearTimeout(touchTimeout);
                }
            });
            
            // Trigger event when events are initialized
            $(document).trigger('wpfe:events_initialized');
        },
        
        // Expose private functions that need to be accessible
        openEditor: openEditor,
        closeEditor: closeEditor,
        setChangeMade: function(state) {
            changeMade = state;
        },
        hasChanges: function() {
            return changeMade;
        }
    };
})(jQuery);