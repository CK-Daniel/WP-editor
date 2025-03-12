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
        $post_id = isset($_GET['post_id']) ? intval($_GET['post_id']) : 0;
        $field_names = isset($_GET['field_names']) ? sanitize_text_field($_GET['field_names']) : '';
        
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
            wp_send_json_error(array(
                'message' => __('Invalid post ID', 'wp-frontend-editor'),
            ));
        }
        
        if (empty($fields)) {
            wp_send_json_error(array(
                'message' => __('No fields to save', 'wp-frontend-editor'),
            ));
        }
        
        // Check if user can edit this post
        if (!current_user_can('edit_post', $post_id)) {
            wp_send_json_error(array(
                'message' => __('You do not have permission to edit this post', 'wp-frontend-editor'),
            ));
        }
        
        // Process form submission
        $result = $this->form_handler->process_form_submission(array(
            'nonce' => $_POST['nonce'],
            'fields' => $fields
        ), $post_id);
        
        if (is_wp_error($result)) {
            wp_send_json_error(array(
                'message' => $result->get_error_message(),
                'errors' => $result->get_error_data()
            ));
        }
        
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
        $attachment_id = isset($_GET['attachment_id']) ? intval($_GET['attachment_id']) : 0;
        
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
        $attachment_ids = isset($_GET['attachment_ids']) ? $_GET['attachment_ids'] : '';
        
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
     * @return void
     */
    public function get_rendered_field() {
        // Check nonce - use wp_die to immediately terminate on failure
        check_ajax_referer('wpfe-editor-nonce', 'nonce', true);
        
        // Get parameters
        $post_id = isset($_GET['post_id']) ? intval($_GET['post_id']) : 0;
        $field_name = isset($_GET['field_name']) ? sanitize_text_field($_GET['field_name']) : '';
        
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
        
        // Buffer the output
        ob_start();
        
        if (function_exists('get_field') && function_exists('get_field_object')) {
            // For ACF fields
            $field_object = get_field_object($field_name, $post_id);
            
            if ($field_object) {
                $value = get_field($field_name, $post_id);
                
                // Add wrapper div with field type class
                echo '<div class="wpfe-field wpfe-field-type-' . esc_attr($field_object['type']) . '">';
                
                // Handle different field types using our specialized field renderer class
                switch ($field_object['type']) {
                    case 'repeater':
                        echo $this->field_renderer->render_acf_repeater($field_name, $post_id, $field_object);
                        break;
                        
                    case 'flexible_content':
                        echo $this->field_renderer->render_acf_flexible_content($field_name, $post_id, $field_object);
                        break;
                        
                    case 'group':
                        echo $this->field_renderer->render_acf_group($field_name, $post_id, $field_object, $value);
                        break;
                        
                    case 'clone':
                        // Clone fields are complex - they inherit properties from the cloned field
                        echo '<div class="acf-clone-field acf-clone-' . esc_attr($field_name) . '">';
                        
                        // If we have prefixed subfields, render each one
                        if (isset($field_object['sub_fields']) && is_array($field_object['sub_fields'])) {
                            foreach ($field_object['sub_fields'] as $sub_field) {
                                $sub_value = get_field($sub_field['name'], $post_id);
                                
                                echo '<div class="acf-field acf-field-' . esc_attr($sub_field['name']) . ' acf-field-type-' . esc_attr($sub_field['type']) . '">';
                                echo '<div class="acf-field-label">' . esc_html($sub_field['label']) . '</div>';
                                
                                echo '<div class="acf-field-value-wrap">';
                                // Use field renderer to handle value formatting
                                echo $this->field_renderer->render_field_value($sub_value, $sub_field);
                                echo '</div>';
                                
                                echo '</div>';
                            }
                        } else {
                            // For clone fields without explicit subfields, just render the value we have
                            echo $this->field_renderer->render_field_value($value, $field_object);
                        }
                        
                        echo '</div>';
                        break;
                        
                    case 'tab':
                    case 'message':
                    case 'accordion':
                        // These are UI-only fields with no actual values
                        echo '<div class="acf-ui-field acf-ui-' . esc_attr($field_object['type']) . '">';
                        
                        if ($field_object['type'] === 'message' && !empty($field_object['message'])) {
                            echo '<div class="acf-message">' . wp_kses_post($field_object['message']) . '</div>';
                        } else {
                            echo '<div class="acf-ui-label">' . esc_html($field_object['label']) . '</div>';
                        }
                        
                        echo '</div>';
                        break;
                        
                    default:
                        // For all other field types, use our field renderer
                        echo $this->field_renderer->render_field_value($value, $field_object);
                        break;
                }
                
                echo '</div>'; // End of wrapper div
            } else {
                // Try to get it as a custom field
                $value = get_post_meta($post_id, $field_name, true);
                echo '<div class="wpfe-field wpfe-field-type-custom">';
                echo esc_html($value);
                echo '</div>';
            }
        } else {
            // Standard WP fields
            $post = get_post($post_id);
            
            echo '<div class="wpfe-field wpfe-field-type-wp">';
            
            switch ($field_name) {
                case 'post_title':
                    echo esc_html($post->post_title);
                    break;
                    
                case 'post_content':
                    // Use the_content filter to properly handle shortcodes and formatting
                    echo apply_filters('the_content', $post->post_content);
                    break;
                    
                case 'post_excerpt':
                    // Preserve newlines but escape HTML
                    echo nl2br(esc_html($post->post_excerpt));
                    break;
                    
                default:
                    // Try as a custom field
                    $value = get_post_meta($post_id, $field_name, true);
                    echo esc_html($value);
                    break;
            }
            
            echo '</div>'; // End of wrapper div
        }
        
        $output = ob_get_clean();
        
        wp_send_json_success(array(
            'html' => $output,
        ));
    }
}