<?php
/**
 * Main AJAX handler class.
 * 
 * Handles AJAX requests for the frontend editor.
 *
 * @package WPFrontendEditor
 * @since 1.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Main AJAX handler class.
 * 
 * @since 1.0.0
 */
class WP_Frontend_Editor_AJAX {

    /**
     * Fields handler instance.
     *
     * @since 1.0.0
     * @var WP_Frontend_Editor_Fields_Handler
     */
    private $fields_handler;

    /**
     * Field renderer instance.
     *
     * @since 1.0.0
     * @var WP_Frontend_Editor_Field_Renderer
     */
    private $field_renderer;

    /**
     * Media handler instance.
     *
     * @since 1.0.0
     * @var WP_Frontend_Editor_Media_Handler
     */
    private $media_handler;
    
    /**
     * ACF utilities instance.
     *
     * @since 1.0.0
     * @var WP_Frontend_Editor_ACF_Utils
     */
    private $acf_utils;
    
    /**
     * Form handler instance.
     *
     * @since 1.0.0
     * @var WP_Frontend_Editor_Form_Handler
     */
    private $form_handler;
    
    /**
     * REST API handler instance.
     *
     * @since 1.0.0
     * @var WP_Frontend_Editor_REST_Handler
     */
    private $rest_handler;

    /**
     * Constructor.
     */
    public function __construct() {
        // Initialize utility classes first
        $this->acf_utils = new WP_Frontend_Editor_ACF_Utils();
        
        // Initialize handler classes
        $this->fields_handler = new WP_Frontend_Editor_Fields_Handler($this->acf_utils);
        $this->field_renderer = new WP_Frontend_Editor_Field_Renderer();
        $this->media_handler = new WP_Frontend_Editor_Media_Handler();
        $this->form_handler = new WP_Frontend_Editor_Form_Handler($this->acf_utils);
        
        // Initialize REST handler with dependencies
        $this->rest_handler = new WP_Frontend_Editor_REST_Handler(
            $this->fields_handler,
            $this->field_renderer,
            $this->media_handler
        );
        
        // Register AJAX actions
        add_action('wp_ajax_wpfe_get_fields', array($this, 'get_fields'));
        add_action('wp_ajax_wpfe_save_fields', array($this, 'save_fields'));
        add_action('wp_ajax_wpfe_get_image_data', array($this, 'get_image_data'));
        add_action('wp_ajax_wpfe_get_gallery_data', array($this, 'get_gallery_data'));
        add_action('wp_ajax_wpfe_get_rendered_field', array($this, 'get_rendered_field'));
        
        // Log AJAX handler initialization
        wpfe_log( 'AJAX Handler initialized', 'debug' );
    }

    /**
     * Get fields via AJAX.
     * 
     * @since 1.0.0
     * @return void
     */
    public function get_fields() {
        // Check nonce - use wp_die to immediately terminate on failure
        check_ajax_referer('wpfe-editor-nonce', 'nonce', true);
        
        // Get parameters
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        $field_names = isset($_POST['field_names']) ? sanitize_text_field($_POST['field_names']) : '';
        
        if (!$post_id) {
            wp_send_json_error(array(
                'message' => __('Invalid post ID', 'wp-frontend-editor'),
            ));
        }
        
        // Check if user can edit this post
        if (!current_user_can('edit_post', $post_id)) {
            wp_send_json_error(array(
                'message' => __('You do not have permission to edit this post', 'wp-frontend-editor'),
            ));
        }
        
        // Get field data using fields handler
        $result = $this->fields_handler->get_field_data($post_id, $field_names);
        
        // Ensure we have data for the requested field to prevent loading issues
        if (empty($result) || !is_array($result)) {
            wp_send_json_error(array(
                'message' => __('No field data was returned by the server', 'wp-frontend-editor'),
                'debug_info' => array(
                    'post_id' => $post_id,
                    'field_names' => $field_names,
                    'user_id' => get_current_user_id(),
                    'result' => $result
                )
            ));
        }
        
        // Extra validation for field data
        $valid_result = false;
        foreach ($result as $field_key => $field_data) {
            if (!empty($field_data) && is_array($field_data) && isset($field_data['type'])) {
                $valid_result = true;
                break;
            }
        }
        
        if (!$valid_result) {
            wp_send_json_error(array(
                'message' => __('Invalid field data structure returned', 'wp-frontend-editor'),
                'debug_info' => array(
                    'post_id' => $post_id,
                    'field_names' => $field_names,
                    'result_keys' => array_keys($result)
                )
            ));
        }
        
        wp_send_json_success($result);
    }

    /**
     * Save fields via AJAX.
     * 
     * @since 1.0.0
     * @return void
     */
    public function save_fields() {
        // Check nonce - use wp_die to immediately terminate on failure
        check_ajax_referer('wpfe-editor-nonce', 'nonce', true);
        
        // Get parameters
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        $fields = isset($_POST['fields']) ? $_POST['fields'] : array();
        
        if (!$post_id) {
            wpfe_log( 'Invalid post ID in save_fields', 'error', array( 'post_id' => $post_id ) );
            wp_send_json_error(array(
                'message' => __('Invalid post ID', 'wp-frontend-editor'),
            ));
        }
        
        if (empty($fields)) {
            wpfe_log( 'No fields to save', 'warning', array( 'post_id' => $post_id ) );
            wp_send_json_error(array(
                'message' => __('No fields to save', 'wp-frontend-editor'),
            ));
        }
        
        // Check if user can edit this post
        if (!current_user_can('edit_post', $post_id)) {
            $current_user_id = get_current_user_id();
            wpfe_log( 'Permission denied for editing post', 'error', array( 
                'post_id' => $post_id,
                'user_id' => $current_user_id
            ));
            wp_send_json_error(array(
                'message' => __('You do not have permission to edit this post', 'wp-frontend-editor'),
            ));
        }
        
        // Log fields being saved
        wpfe_log( 'Saving fields for post', 'info', array(
            'post_id' => $post_id,
            'field_count' => count($fields),
            'field_names' => array_keys($fields)
        ));
        
        // Process form submission
        $result = $this->form_handler->process_form_submission(array(
            'nonce' => $_POST['nonce'],
            'fields' => $fields
        ), $post_id);
        
        if (is_wp_error($result)) {
            wpfe_log( 'Error saving fields', 'error', array(
                'post_id' => $post_id,
                'error' => $result->get_error_message(),
                'error_data' => $result->get_error_data()
            ));
            wp_send_json_error(array(
                'message' => $result->get_error_message(),
                'errors' => $result->get_error_data()
            ));
        }
        
        // Log successful save
        wpfe_log( 'Fields saved successfully', 'success', array(
            'post_id' => $post_id,
            'post_title' => get_the_title($post_id),
            'updated_fields' => isset($result['updated_fields']) ? $result['updated_fields'] : []
        ));
        
        wp_send_json_success($result);
    }

    /**
     * Get image data via AJAX.
     * 
     * @since 1.0.0
     * @return void
     */
    public function get_image_data() {
        // Check nonce - use wp_die to immediately terminate on failure
        check_ajax_referer('wpfe-editor-nonce', 'nonce', true);
        
        // Get parameters
        $attachment_id = isset($_POST['attachment_id']) ? intval($_POST['attachment_id']) : 0;
        
        if (!$attachment_id) {
            wp_send_json_error(array(
                'message' => __('Invalid attachment ID', 'wp-frontend-editor'),
            ));
        }
        
        // Verify attachment exists and user has permission
        if (!get_post($attachment_id) || !current_user_can('read_post', $attachment_id)) {
            wp_send_json_error(array(
                'message' => __('You do not have permission to access this attachment', 'wp-frontend-editor'),
            ));
        }
        
        // Get image data using media handler
        $result = $this->media_handler->get_image_data($attachment_id);
        
        wp_send_json_success($result);
    }

    /**
     * Get gallery data via AJAX.
     * 
     * @since 1.0.0
     * @return void
     */
    public function get_gallery_data() {
        // Check nonce - use wp_die to immediately terminate on failure
        check_ajax_referer('wpfe-editor-nonce', 'nonce', true);
        
        // Get parameters
        $attachment_ids = isset($_POST['attachment_ids']) ? $_POST['attachment_ids'] : '';
        
        if (empty($attachment_ids)) {
            wp_send_json_error(array(
                'message' => __('Invalid attachment IDs', 'wp-frontend-editor'),
            ));
        }
        
        // Convert string to array if needed
        if (is_string($attachment_ids)) {
            $attachment_ids = explode(',', $attachment_ids);
        }
        
        // Validate and sanitize all IDs
        $attachment_ids = array_map('intval', $attachment_ids);
        $attachment_ids = array_filter($attachment_ids);
        
        if (empty($attachment_ids)) {
            wp_send_json_error(array(
                'message' => __('No valid attachment IDs provided', 'wp-frontend-editor'),
            ));
        }
        
        // Get gallery data using our media handler
        $result = $this->media_handler->get_gallery_data($attachment_ids);
        
        wp_send_json_success($result);
    }
    
    /**
     * Get a rendered field.
     * 
     * Used to update complex fields (repeaters, flexible content) without page reload.
     * Handles all ACF field types with appropriate rendering.
     * 
     * @since 1.0.0
     * @updated 1.0.1 Added support for all ACF field types
     * @updated 1.0.2 Refactored to use field renderer class
     * @updated 1.0.3.7 Updated to use the native field editor interface
     * @return void
     */
    public function get_rendered_field() {
        // Check nonce with multiple parameter names for backward compatibility
        if (isset($_REQUEST['nonce'])) {
            check_ajax_referer('wpfe-editor-nonce', 'nonce', true);
        } elseif (isset($_REQUEST['security'])) {
            check_ajax_referer('wpfe-editor-nonce', 'security', true);
        } else {
            check_ajax_referer('wpfe-editor-nonce', '_wpnonce', true);
        }
        
        // Get parameters
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        $field_name = isset($_POST['field_name']) ? sanitize_text_field($_POST['field_name']) : '';
        
        if (!$post_id || !$field_name) {
            wp_send_json_error(array(
                'message' => __('Invalid parameters', 'wp-frontend-editor'),
            ));
        }
        
        // Check if user can edit this post
        if (!current_user_can('edit_post', $post_id)) {
            wp_send_json_error(array(
                'message' => __('You do not have permission to edit this post', 'wp-frontend-editor'),
            ));
        }
        
        // Use the fields handler to get the rendered field
        $result = $this->fields_handler->get_rendered_field($field_name, $post_id);
        
        if (!isset($result['success']) || !$result['success']) {
            wp_send_json_error(array(
                'message' => isset($result['message']) ? $result['message'] : __('Failed to load field', 'wp-frontend-editor'),
            ));
        }
        
        wp_send_json_success($result);
    }
}