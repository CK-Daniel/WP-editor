<?php
/**
 * The AJAX handler class.
 *
 * @package WPFrontendEditor
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * AJAX handler class.
 */
class WP_Frontend_Editor_AJAX {

    /**
     * Constructor.
     */
    public function __construct() {
        // Register AJAX actions
        add_action( 'wp_ajax_wpfe_get_fields', array( $this, 'get_fields' ) );
        add_action( 'wp_ajax_wpfe_save_fields', array( $this, 'save_fields' ) );
        
        // Register REST API routes
        add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
    }

    /**
     * Register REST API routes.
     */
    public function register_rest_routes() {
        register_rest_route(
            'wp-frontend-editor/v1',
            '/get-fields',
            array(
                'methods'             => 'GET',
                'callback'            => array( $this, 'rest_get_fields' ),
                'permission_callback' => array( $this, 'rest_permissions_check' ),
                'args'                => array(
                    'post_id' => array(
                        'validate_callback' => function( $param ) {
                            return is_numeric( $param );
                        }
                    ),
                    'fields' => array(
                        'validate_callback' => function( $param ) {
                            return is_string( $param ) || is_array( $param );
                        }
                    ),
                ),
            )
        );

        register_rest_route(
            'wp-frontend-editor/v1',
            '/save-fields',
            array(
                'methods'             => 'POST',
                'callback'            => array( $this, 'rest_save_fields' ),
                'permission_callback' => array( $this, 'rest_permissions_check' ),
                'args'                => array(
                    'post_id' => array(
                        'validate_callback' => function( $param ) {
                            return is_numeric( $param );
                        }
                    ),
                    'fields' => array(
                        'validate_callback' => function( $param ) {
                            return is_array( $param );
                        }
                    ),
                ),
            )
        );
    }

    /**
     * Check permissions for REST API requests.
     *
     * @param WP_REST_Request $request The request object.
     * @return bool|WP_Error True if the request has access, WP_Error otherwise.
     */
    public function rest_permissions_check( $request ) {
        $post_id = $request->get_param( 'post_id' );

        if ( ! $post_id ) {
            return new WP_Error(
                'rest_forbidden',
                __( 'Post ID is required', 'wp-frontend-editor' ),
                array( 'status' => 403 )
            );
        }

        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return new WP_Error(
                'rest_forbidden',
                __( 'You do not have permission to edit this post', 'wp-frontend-editor' ),
                array( 'status' => 403 )
            );
        }

        return true;
    }

    /**
     * Get fields via REST API.
     *
     * @param WP_REST_Request $request The request object.
     * @return WP_REST_Response The response object.
     */
    public function rest_get_fields( $request ) {
        $post_id = $request->get_param( 'post_id' );
        $fields = $request->get_param( 'fields' );

        if ( ! $fields ) {
            $fields = 'all';
        }

        $data = $this->get_field_data( $post_id, $fields );

        return rest_ensure_response( $data );
    }

    /**
     * Save fields via REST API.
     *
     * @param WP_REST_Request $request The request object.
     * @return WP_REST_Response The response object.
     */
    public function rest_save_fields( $request ) {
        $post_id = $request->get_param( 'post_id' );
        $fields = $request->get_param( 'fields' );

        $result = $this->save_field_data( $post_id, $fields );

        if ( is_wp_error( $result ) ) {
            return rest_ensure_response( $result );
        }

        return rest_ensure_response( array(
            'success' => true,
            'message' => __( 'Fields saved successfully', 'wp-frontend-editor' ),
            'data'    => $result,
        ) );
    }

    /**
     * AJAX handler for getting fields.
     */
    public function get_fields() {
        // Check nonce
        if ( ! check_ajax_referer( 'wpfe-editor-nonce', 'nonce', false ) ) {
            wp_send_json_error( array(
                'message' => __( 'Security check failed', 'wp-frontend-editor' ),
            ) );
        }

        // Get post ID
        $post_id = isset( $_GET['post_id'] ) ? intval( $_GET['post_id'] ) : 0;

        if ( ! $post_id ) {
            wp_send_json_error( array(
                'message' => __( 'Post ID is required', 'wp-frontend-editor' ),
            ) );
        }

        // Check permissions
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            wp_send_json_error( array(
                'message' => __( 'You do not have permission to edit this post', 'wp-frontend-editor' ),
            ) );
        }

        // Get field names
        $fields = isset( $_GET['fields'] ) ? sanitize_text_field( $_GET['fields'] ) : 'all';

        // Get field data
        $data = $this->get_field_data( $post_id, $fields );

        wp_send_json_success( $data );
    }

    /**
     * AJAX handler for saving fields.
     */
    public function save_fields() {
        // Check nonce
        if ( ! check_ajax_referer( 'wpfe-editor-nonce', 'nonce', false ) ) {
            wp_send_json_error( array(
                'message' => __( 'Security check failed', 'wp-frontend-editor' ),
            ) );
        }

        // Get post ID
        $post_id = isset( $_POST['post_id'] ) ? intval( $_POST['post_id'] ) : 0;

        if ( ! $post_id ) {
            wp_send_json_error( array(
                'message' => __( 'Post ID is required', 'wp-frontend-editor' ),
            ) );
        }

        // Check permissions
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            wp_send_json_error( array(
                'message' => __( 'You do not have permission to edit this post', 'wp-frontend-editor' ),
            ) );
        }

        // Get fields data
        $fields = isset( $_POST['fields'] ) ? $_POST['fields'] : array();

        if ( empty( $fields ) ) {
            wp_send_json_error( array(
                'message' => __( 'No fields provided', 'wp-frontend-editor' ),
            ) );
        }

        // Save fields
        $result = $this->save_field_data( $post_id, $fields );

        if ( is_wp_error( $result ) ) {
            wp_send_json_error( array(
                'message' => $result->get_error_message(),
            ) );
        }

        wp_send_json_success( array(
            'message' => __( 'Fields saved successfully', 'wp-frontend-editor' ),
            'data'    => $result,
        ) );
    }

    /**
     * Get field data.
     *
     * @param int          $post_id The post ID.
     * @param string|array $fields The field names to get.
     * @return array The field data.
     */
    private function get_field_data( $post_id, $fields ) {
        $post = get_post( $post_id );

        if ( ! $post ) {
            return array();
        }

        $data = array();

        // If fields is a string, convert it to an array
        if ( 'all' === $fields ) {
            $options = get_option( 'wpfe_options', array() );
            $fields = isset( $options['core_fields'] ) ? $options['core_fields'] : array( 'title', 'content', 'excerpt', 'featured_image' );
        } elseif ( is_string( $fields ) ) {
            $fields = explode( ',', $fields );
        }

        // Get core fields
        foreach ( $fields as $field ) {
            switch ( $field ) {
                case 'title':
                case 'post_title':
                    $data['post_title'] = array(
                        'value' => $post->post_title,
                        'type'  => 'text',
                        'label' => __( 'Title', 'wp-frontend-editor' ),
                    );
                    break;

                case 'content':
                case 'post_content':
                    $data['post_content'] = array(
                        'value' => $post->post_content,
                        'type'  => 'wysiwyg',
                        'label' => __( 'Content', 'wp-frontend-editor' ),
                    );
                    break;

                case 'excerpt':
                case 'post_excerpt':
                    $data['post_excerpt'] = array(
                        'value' => $post->post_excerpt,
                        'type'  => 'textarea',
                        'label' => __( 'Excerpt', 'wp-frontend-editor' ),
                    );
                    break;

                case 'featured_image':
                    $thumbnail_id = get_post_thumbnail_id( $post_id );
                    $thumbnail_url = $thumbnail_id ? wp_get_attachment_image_url( $thumbnail_id, 'thumbnail' ) : '';
                    
                    $data['featured_image'] = array(
                        'value' => $thumbnail_id,
                        'url'   => $thumbnail_url,
                        'type'  => 'image',
                        'label' => __( 'Featured Image', 'wp-frontend-editor' ),
                    );
                    break;

                default:
                    // Check if it's an ACF field
                    if ( class_exists( 'ACF' ) && function_exists( 'get_field' ) ) {
                        // Check if field exists
                        $acf_field = acf_get_field( $field );
                        
                        if ( $acf_field ) {
                            $field_value = get_field( $field, $post_id, false );
                            
                            $data[ $field ] = array(
                                'value' => $field_value,
                                'type'  => $acf_field['type'],
                                'label' => $acf_field['label'],
                                'field_config' => $acf_field,
                            );
                        }
                    }
                    break;
            }
        }

        return $data;
    }

    /**
     * Save field data.
     *
     * @param int   $post_id The post ID.
     * @param array $fields The fields to save.
     * @return array|WP_Error The updated fields or an error.
     */
    private function save_field_data( $post_id, $fields ) {
        $post = get_post( $post_id );

        if ( ! $post ) {
            return new WP_Error(
                'wpfe_post_not_found',
                __( 'Post not found', 'wp-frontend-editor' )
            );
        }

        $updated_fields = array();
        $post_data = array(
            'ID' => $post_id,
        );

        $errors = array();

        // Process each field
        foreach ( $fields as $field => $value ) {
            $field_name = sanitize_text_field( $field );
            
            switch ( $field_name ) {
                case 'post_title':
                    $post_data['post_title'] = sanitize_text_field( $value );
                    $updated_fields['post_title'] = $post_data['post_title'];
                    break;

                case 'post_content':
                    $post_data['post_content'] = wp_kses_post( $value );
                    $updated_fields['post_content'] = $post_data['post_content'];
                    break;

                case 'post_excerpt':
                    $post_data['post_excerpt'] = sanitize_textarea_field( $value );
                    $updated_fields['post_excerpt'] = $post_data['post_excerpt'];
                    break;

                case 'featured_image':
                    $attachment_id = absint( $value );
                    
                    if ( $attachment_id ) {
                        set_post_thumbnail( $post_id, $attachment_id );
                    } else {
                        delete_post_thumbnail( $post_id );
                    }
                    
                    $updated_fields['featured_image'] = $attachment_id;
                    break;

                default:
                    // Check if it's an ACF field
                    if ( class_exists( 'ACF' ) && function_exists( 'update_field' ) ) {
                        // Check if field exists
                        $acf_field = acf_get_field( $field_name );
                        
                        if ( $acf_field ) {
                            // For file/image fields, make sure we get the ID
                            if ( in_array( $acf_field['type'], array( 'image', 'file' ), true ) && is_array( $value ) && isset( $value['id'] ) ) {
                                $value = $value['id'];
                            }
                            
                            // Save the field
                            $updated = update_field( $field_name, $value, $post_id );
                            
                            if ( $updated ) {
                                $updated_fields[ $field_name ] = $value;
                            } else {
                                $errors[] = sprintf(
                                    /* translators: %s: field name */
                                    __( 'Failed to update ACF field: %s', 'wp-frontend-editor' ),
                                    $acf_field['label']
                                );
                            }
                        }
                    } else {
                        // Maybe it's a custom field (post meta)
                        $updated = update_post_meta( $post_id, $field_name, $value );
                        
                        if ( $updated ) {
                            $updated_fields[ $field_name ] = $value;
                        }
                    }
                    break;
            }
        }

        // Update the post if there are post data fields to update
        if ( count( $post_data ) > 1 ) {
            $result = wp_update_post( $post_data, true );
            
            if ( is_wp_error( $result ) ) {
                $errors[] = $result->get_error_message();
            }
        }

        // If there are errors, return them
        if ( ! empty( $errors ) ) {
            return new WP_Error(
                'wpfe_save_error',
                implode( '. ', $errors )
            );
        }

        return $updated_fields;
    }
}