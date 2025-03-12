<?php
/**
 * REST API handler class.
 * 
 * Handles all REST API endpoints for the frontend editor.
 *
 * @package WPFrontendEditor
 * @since 1.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * REST API handler class.
 * 
 * @since 1.0.0
 */
class WP_Frontend_Editor_REST_Handler {

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
     * Constructor.
     *
     * @since 1.0.0
     */
    public function __construct( $fields_handler, $field_renderer, $media_handler ) {
        $this->fields_handler = $fields_handler;
        $this->field_renderer = $field_renderer;
        $this->media_handler = $media_handler;
        
        // Register REST API routes
        add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
    }

    /**
     * Register REST API routes.
     *
     * @since 1.0.0
     * @return void
     */
    public function register_rest_routes() {
        register_rest_route( 'wp-frontend-editor/v1', '/fields', array(
            'methods'  => 'GET',
            'callback' => array( $this, 'rest_get_fields' ),
            'permission_callback' => array( $this, 'rest_permissions_check' ),
        ) );
        
        register_rest_route( 'wp-frontend-editor/v1', '/fields', array(
            'methods'  => 'POST',
            'callback' => array( $this, 'rest_save_fields' ),
            'permission_callback' => array( $this, 'rest_permissions_check' ),
        ) );
        
        register_rest_route( 'wp-frontend-editor/v1', '/image', array(
            'methods'  => 'GET',
            'callback' => array( $this, 'rest_get_image_data' ),
            'permission_callback' => array( $this, 'rest_permissions_check' ),
        ) );
        
        register_rest_route( 'wp-frontend-editor/v1', '/gallery', array(
            'methods'  => 'GET',
            'callback' => array( $this, 'rest_get_gallery_data' ),
            'permission_callback' => array( $this, 'rest_permissions_check' ),
        ) );
        
        register_rest_route( 'wp-frontend-editor/v1', '/render-field', array(
            'methods'  => 'GET',
            'callback' => array( $this, 'rest_get_rendered_field' ),
            'permission_callback' => array( $this, 'rest_permissions_check' ),
        ) );
    }

    /**
     * Check permissions for REST API requests.
     *
     * @since 1.0.0
     * @param WP_REST_Request $request The request object.
     * @return bool
     */
    public function rest_permissions_check( $request ) {
        // Check nonce
        $nonce = $request->get_header( 'X-WP-Nonce' );
        if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return false;
        }
        
        // Check post permission based on post_id parameter
        $post_id = isset( $request['post_id'] ) ? intval( $request['post_id'] ) : 0;
        if ( $post_id ) {
            return current_user_can( 'edit_post', $post_id );
        }
        
        // Check general permissions
        return current_user_can( 'edit_posts' );
    }

    /**
     * REST API callback for getting fields.
     *
     * @since 1.0.0
     * @param WP_REST_Request $request The request object.
     * @return WP_REST_Response
     */
    public function rest_get_fields( $request ) {
        $post_id = isset( $request['post_id'] ) ? intval( $request['post_id'] ) : 0;
        $field_names = isset( $request['field_names'] ) ? sanitize_text_field( $request['field_names'] ) : '';
        
        if ( ! $post_id ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => __( 'Invalid post ID', 'wp-frontend-editor' ),
            ), 400 );
        }
        
        // Get field data using fields handler
        $result = $this->fields_handler->get_field_data( $post_id, $field_names );
        
        return new WP_REST_Response( array(
            'success' => true,
            'data' => $result,
        ), 200 );
    }

    /**
     * REST API callback for saving fields.
     *
     * @since 1.0.0
     * @param WP_REST_Request $request The request object.
     * @return WP_REST_Response
     */
    public function rest_save_fields( $request ) {
        $post_id = isset( $request['post_id'] ) ? intval( $request['post_id'] ) : 0;
        $fields = isset( $request['fields'] ) ? $request['fields'] : array();
        
        if ( ! $post_id ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => __( 'Invalid post ID', 'wp-frontend-editor' ),
            ), 400 );
        }
        
        if ( empty( $fields ) ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => __( 'No fields to save', 'wp-frontend-editor' ),
            ), 400 );
        }
        
        // Save field data using fields handler
        $result = $this->fields_handler->save_field_data( $post_id, $fields );
        
        if ( is_wp_error( $result ) ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => $result->get_error_message(),
            ), 400 );
        }
        
        return new WP_REST_Response( array(
            'success' => true,
            'message' => __( 'Fields saved successfully', 'wp-frontend-editor' ),
            'data' => $result,
        ), 200 );
    }

    /**
     * REST API callback for getting image data.
     *
     * @since 1.0.0
     * @param WP_REST_Request $request The request object.
     * @return WP_REST_Response
     */
    public function rest_get_image_data( $request ) {
        $attachment_id = isset( $request['attachment_id'] ) ? intval( $request['attachment_id'] ) : 0;
        
        if ( ! $attachment_id ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => __( 'Invalid attachment ID', 'wp-frontend-editor' ),
            ), 400 );
        }
        
        // Verify attachment exists and user has permission
        if ( ! get_post( $attachment_id ) || ! current_user_can( 'read_post', $attachment_id ) ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => __( 'You do not have permission to access this attachment', 'wp-frontend-editor' ),
            ), 403 );
        }
        
        // Get image data using media handler
        $result = $this->media_handler->get_image_data( $attachment_id );
        
        return new WP_REST_Response( array(
            'success' => true,
            'data' => $result,
        ), 200 );
    }

    /**
     * REST API callback for getting gallery data.
     *
     * @since 1.0.0
     * @param WP_REST_Request $request The request object.
     * @return WP_REST_Response
     */
    public function rest_get_gallery_data( $request ) {
        $attachment_ids = isset( $request['attachment_ids'] ) ? $request['attachment_ids'] : '';
        
        if ( empty( $attachment_ids ) ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => __( 'Invalid attachment IDs', 'wp-frontend-editor' ),
            ), 400 );
        }
        
        // Convert string to array if needed
        if ( is_string( $attachment_ids ) ) {
            $attachment_ids = explode( ',', $attachment_ids );
        }
        
        // Validate and sanitize all IDs
        $attachment_ids = array_map( 'intval', $attachment_ids );
        $attachment_ids = array_filter( $attachment_ids );
        
        if ( empty( $attachment_ids ) ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => __( 'No valid attachment IDs provided', 'wp-frontend-editor' ),
            ), 400 );
        }
        
        // Get gallery data using media handler
        $result = $this->media_handler->get_gallery_data( $attachment_ids );
        
        return new WP_REST_Response( array(
            'success' => true,
            'data' => $result,
        ), 200 );
    }

    /**
     * REST API callback for getting a rendered field.
     *
     * @since 1.0.0
     * @param WP_REST_Request $request The request object.
     * @return WP_REST_Response
     */
    public function rest_get_rendered_field( $request ) {
        $post_id = isset( $request['post_id'] ) ? intval( $request['post_id'] ) : 0;
        $field_name = isset( $request['field_name'] ) ? sanitize_text_field( $request['field_name'] ) : '';
        
        if ( ! $post_id || ! $field_name ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => __( 'Invalid parameters', 'wp-frontend-editor' ),
            ), 400 );
        }
        
        // Buffer the output
        ob_start();
        
        if ( function_exists( 'get_field' ) && function_exists( 'get_field_object' ) ) {
            // For ACF fields
            $field_object = get_field_object( $field_name, $post_id );
            
            if ( $field_object ) {
                $value = get_field( $field_name, $post_id );
                
                // Add wrapper div with field type class
                echo '<div class="wpfe-field wpfe-field-type-' . esc_attr($field_object['type']) . '">';
                
                // Handle different field types using our specialized field renderer class
                switch ( $field_object['type'] ) {
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
                $value = get_post_meta( $post_id, $field_name, true );
                echo '<div class="wpfe-field wpfe-field-type-custom">';
                echo esc_html( $value );
                echo '</div>';
            }
        } else {
            // Standard WP fields
            $post = get_post( $post_id );
            
            echo '<div class="wpfe-field wpfe-field-type-wp">';
            
            switch ( $field_name ) {
                case 'post_title':
                    echo esc_html( $post->post_title );
                    break;
                    
                case 'post_content':
                    // Use the_content filter to properly handle shortcodes and formatting
                    echo apply_filters( 'the_content', $post->post_content );
                    break;
                    
                case 'post_excerpt':
                    // Preserve newlines but escape HTML
                    echo nl2br( esc_html( $post->post_excerpt ) );
                    break;
                    
                default:
                    // Try as a custom field
                    $value = get_post_meta( $post_id, $field_name, true );
                    echo esc_html( $value );
                    break;
            }
            
            echo '</div>'; // End of wrapper div
        }
        
        $output = ob_get_clean();
        
        return new WP_REST_Response( array(
            'success' => true,
            'html' => $output,
        ), 200 );
    }
}