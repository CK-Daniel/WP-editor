/**
 * WP Frontend Editor AJAX Module
 * Handles all communication with the server
 */

var WPFE = WPFE || {};

WPFE.ajax = (function($) {
    'use strict';
    
    // Mark this module as loaded
    WPFE.modulesReady.ajax = true;
    if (WPFE.debug && WPFE.debug.modulesLoaded) {
        WPFE.debug.modulesLoaded.push('ajax');
    }

    // Private variables
    var pendingRequests = {};
    var requestQueue = [];
    var maxConcurrentRequests = 2;
    var processingQueue = false;

    // Private functions
    /**
     * Process the request queue
     */
    function processQueue() {
        if (processingQueue || requestQueue.length === 0) {
            return;
        }
        
        processingQueue = true;
        
        // Count active requests
        var activeRequests = 0;
        for (var key in pendingRequests) {
            if (pendingRequests.hasOwnProperty(key) && pendingRequests[key]) {
                activeRequests++;
            }
        }
        
        // Process as many requests as we can
        var requestsToProcess = Math.min(maxConcurrentRequests - activeRequests, requestQueue.length);
        
        if (requestsToProcess > 0) {
            for (var i = 0; i < requestsToProcess; i++) {
                var request = requestQueue.shift();
                executeRequest(request.requestKey, request.data, request.callback);
            }
        }
        
        processingQueue = false;
        
        // If there are more requests, continue processing
        if (requestQueue.length > 0) {
            processQueue();
        }
    }

    /**
     * Execute an AJAX request
     * 
     * @param {string} requestKey Unique key for this request
     * @param {Object} data The data to send
     * @param {Function} callback The callback function
     */
    function executeRequest(requestKey, data, callback) {
        pendingRequests[requestKey] = true;
        
        // Log the request for debugging
        console.log('WPFE: Executing AJAX request:', data.action, requestKey);
        
        $.ajax({
            url: wpfe_data.ajax_url,
            type: 'POST',
            data: data,
            dataType: 'json',
            timeout: 30000, // 30 second timeout
            success: function(response) {
                delete pendingRequests[requestKey];
                
                if (typeof callback === 'function') {
                    callback(response);
                }
                
                // Check if we can process more items in the queue
                processQueue();
            },
            error: function(xhr, status, error) {
                delete pendingRequests[requestKey];
                
                var response = {
                    success: false,
                    message: error || wpfe_data.i18n.ajax_error || 'Unknown error',
                    error_code: 'ajax_error',
                    status: xhr.status
                };
                
                // Try to parse error response if available
                if (xhr.responseText) {
                    try {
                        var errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse) {
                            response = errorResponse;
                        }
                    } catch (e) {
                        // If parsing fails, use the raw response
                        response.message = xhr.responseText;
                    }
                }
                
                // Add more descriptive messages for common errors
                if (xhr.status === 0) {
                    response.message = 'Could not connect to the server. Please check your internet connection.';
                    response.error_code = 'connection_error';
                } else if (xhr.status === 403) {
                    response.message = 'You do not have permission to perform this action. Please refresh the page and try again.';
                    response.error_code = 'permission_denied';
                } else if (xhr.status === 404) {
                    response.message = 'The requested resource could not be found. Please reload the page and try again.';
                    response.error_code = 'not_found';
                } else if (xhr.status === 500) {
                    response.message = 'Internal server error. Please try again later or contact support.';
                    response.error_code = 'server_error';
                } else if (status === 'timeout') {
                    response.message = 'The request timed out. Please try again.';
                    response.error_code = 'timeout';
                } else if (status === 'abort') {
                    response.message = 'The request was aborted. Please try again.';
                    response.error_code = 'abort';
                }
                
                if (typeof callback === 'function') {
                    callback(response);
                }
                
                // Show error notification if WPFE UI is available
                if (typeof WPFE.ui !== 'undefined' && typeof WPFE.ui.showNotification === 'function') {
                    WPFE.ui.showNotification(response.message, 'error');
                }
                
                if (wpfe_data.debug_mode) {
                    console.error('AJAX Error:', {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        responseText: xhr.responseText,
                        error: error,
                        action: data.action,
                        errorCode: response.error_code
                    });
                }
                
                // Check if we can process more items in the queue
                processQueue();
            }
        });
    }

    /**
     * Queue or execute an AJAX request
     * 
     * @param {string} action The AJAX action
     * @param {Object} additionalData Additional data to send
     * @param {Function} callback The callback function
     * @param {boolean} priority Whether to prioritize this request
     */
    function queueRequest(action, additionalData, callback, priority) {
        var data = {
            action: action,
            nonce: wpfe_data.nonce,
            security: wpfe_data.nonce,
            _wpnonce: wpfe_data.nonce
        };
        
        // Merge additional data
        if (additionalData) {
            data = $.extend(data, additionalData);
        }
        
        var requestKey = action + '_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
        
        var request = {
            requestKey: requestKey,
            data: data,
            callback: callback
        };
        
        // Either add to queue or execute immediately
        var activeRequests = 0;
        for (var key in pendingRequests) {
            if (pendingRequests.hasOwnProperty(key) && pendingRequests[key]) {
                activeRequests++;
            }
        }
        
        if (activeRequests < maxConcurrentRequests) {
            // Execute immediately
            executeRequest(requestKey, data, callback);
        } else {
            // Add to queue
            if (priority) {
                requestQueue.unshift(request);
            } else {
                requestQueue.push(request);
            }
            
            // Try to process queue
            processQueue();
        }
    }

    // Public API
    return {
        /**
         * Fetch field data from the server
         * 
         * @param {string} fieldName The field name
         * @param {number} postId The post ID
         * @param {Function} callback The callback function
         */
        fetchField: function(fieldName, postId, callback) {
            // Add timeout handling to prevent indefinite loading state
            var requestTimeout = setTimeout(function() {
                // If the request takes longer than 15 seconds, force error response
                var timeoutResponse = {
                    success: false,
                    data: {
                        message: 'The request timed out. The server might be slow or unable to process your request.'
                    }
                };
                if (typeof callback === 'function') {
                    callback(timeoutResponse);
                }
                console.error('WPFE: Field fetch request timed out for ' + fieldName);
                
                // Force the sidebar to show an error to prevent indefinite loading
                var $sidebar = $('#wpfe-editor-sidebar');
                if ($sidebar.length) {
                    // Find the content container
                    var $contentContainer = $sidebar.find('.wpfe-editor-sidebar-content');
                    if (!$contentContainer.length) {
                        $contentContainer = $sidebar;
                    }
                    
                    // Add error message with properly styled error display
                    $contentContainer.html(
                        '<div class="wpfe-error">' +
                        '<p>Request timed out while loading the editor.</p>' +
                        '<p class="wpfe-error-details">Please try again or reload the page.</p>' +
                        '<div class="wpfe-error-actions">' +
                        '<button type="button" class="wpfe-close-button button">Close</button>' +
                        '</div></div>'
                    );
                }
            }, 15000); // 15 second timeout
            
            // Create a wrapper callback to clear the timeout
            var wrappedCallback = function(response) {
                clearTimeout(requestTimeout);
                if (typeof callback === 'function') {
                    callback(response);
                }
            };
            
            console.log('WPFE: Fetching field data for:', fieldName, 'post ID:', postId);
            
            queueRequest('wpfe_get_fields', {
                field_names: fieldName,
                post_id: postId
            }, function(response) {
                console.log('WPFE: Field data response received:', response);
                wrappedCallback(response);
            }, true);
        },
        
        /**
         * Save changes to the active field
         */
        saveChanges: function() {
            var sidebar = WPFE.core.getSidebar();
            var activeField = WPFE.core.getActiveField();
            var activePostId = WPFE.core.getActivePostId();
            
            if (!activeField || !activePostId) {
                return;
            }
            
            // Show saving indicator
            sidebar.find('.wpfe-save-button').addClass('wpfe-saving')
                .html('<span class="dashicons dashicons-update-alt"></span> ' + (wpfe_data.i18n.saving || 'Saving...'));
            
            // Get field value (special handling for different field types)
            var value = WPFE.fields.getFieldValue(activeField);
            
            // Save field value
            this.saveFieldChange(activeField, activePostId, value, function(response) {
                // Reset the save button
                sidebar.find('.wpfe-save-button').removeClass('wpfe-saving')
                    .html('<span class="dashicons dashicons-saved"></span> ' + (wpfe_data.i18n.save || 'Save'));
                
                if (response.success) {
                    WPFE.events.setChangeMade(false);
                    WPFE.events.closeEditor(true);
                    
                    // Show success notification
                    WPFE.ui.showNotification((wpfe_data.i18n.save_success || 'Changes saved successfully.'), 'success');
                    
                    // Update the page content if needed
                    if (response.data && response.data.updated_content) {
                        WPFE.fields.updatePageContent(response.data.updated_content);
                    }
                } else {
                    // Show error notification
                    WPFE.ui.showNotification(response.message || (wpfe_data.i18n.save_error || 'Error saving changes.'), 'error');
                }
            });
        },
        
        /**
         * Save a field change to the server
         * 
         * @param {string} fieldName The field name
         * @param {number} postId The post ID
         * @param {*} value The new field value
         * @param {Function} callback The callback function
         */
        saveFieldChange: function(fieldName, postId, value, callback) {
            // Check if we should use the native fields handler
            if (typeof WPFE.nativeFields !== 'undefined' && WPFE.nativeFields.isInitialized()) {
                // Get field values from the native fields module
                var fieldValues = WPFE.nativeFields.getFieldValues();
                
                queueRequest('wpfe_save_fields', {
                    post_id: postId,
                    fields: fieldValues
                }, callback, true);
            } else {
                // Use the original approach
                queueRequest('wpfe_save_fields', {
                    post_id: postId,
                    fields: {
                        [fieldName]: value
                    }
                }, callback, true);
            }
        },
        
        /**
         * Fetch a rendered field from the server
         * 
         * @param {string} fieldName The field name
         * @param {number} postId The post ID
         * @param {Function} callback The callback function
         */
        getRenderedField: function(fieldName, postId, callback) {
            queueRequest('wpfe_get_rendered_field', {
                field_name: fieldName,
                post_id: postId
            }, callback);
        },
        
        /**
         * Upload a media file
         * 
         * @param {File} file The file to upload
         * @param {Function} progressCallback Called with progress updates
         * @param {Function} completeCallback Called when upload completes
         */
        uploadMedia: function(file, progressCallback, completeCallback) {
            var formData = new FormData();
            formData.append('action', 'wpfe_upload_media');
            formData.append('security', wpfe_data.nonce);
            formData.append('_wpnonce', wpfe_data.nonce);
            formData.append('file', file);
            
            $.ajax({
                url: wpfe_data.ajax_url,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                xhr: function() {
                    var xhr = new window.XMLHttpRequest();
                    
                    if (xhr.upload && typeof progressCallback === 'function') {
                        xhr.upload.addEventListener('progress', function(evt) {
                            if (evt.lengthComputable) {
                                var percentComplete = (evt.loaded / evt.total) * 100;
                                progressCallback(percentComplete);
                            }
                        }, false);
                    }
                    
                    return xhr;
                },
                success: function(response) {
                    if (typeof completeCallback === 'function') {
                        completeCallback(response);
                    }
                },
                error: function(xhr, status, error) {
                    var response = {
                        success: false,
                        message: error || wpfe_data.i18n.upload_error || 'Upload failed'
                    };
                    
                    if (typeof completeCallback === 'function') {
                        completeCallback(response);
                    }
                    
                    if (wpfe_data.debug_mode) {
                        console.error('Upload Error:', error, xhr);
                    }
                }
            });
        }
    };
})(jQuery);