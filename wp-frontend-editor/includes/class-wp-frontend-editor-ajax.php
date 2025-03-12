<?php
/**
 * The AJAX handler class.
 * 
 * This class handles all AJAX and REST API requests for the WP Frontend Editor.
 * It provides methods for retrieving and saving field data, image handling,
 * and rendering complex fields.
 *
 * @package WPFrontendEditor
 * @since 1.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * AJAX handler class for WP Frontend Editor.
 * 
 * Handles all AJAX and REST API requests for retrieving and saving field data,
 * processing images and galleries, and rendering complex ACF fields.
 * 
 * Security improvements (v1.0.1):
 * - Added stronger nonce verification (using wp_die=true parameter)
 * - Enhanced input validation and sanitization
 * - Added permission checks for attachment access
 * - Improved error reporting
 * - Added field type validation for unsupported field types
 * - Added proper escaping for HTML output
 * 
 * Performance improvements (v1.0.1):
 * - Added caching layer for ACF field lookups
 * - Limited recursion depth for field searches
 * - Added configurable posts_per_page limit for relationship fields
 * 
 * @since 1.0.0
 * @updated 1.0.1
 */
class WP_Frontend_Editor_AJAX {

    /**
     * Constructor.
     */
    public function __construct() {
        // Register AJAX actions
        add_action( 'wp_ajax_wpfe_get_fields', array( $this, 'get_fields' ) );
        add_action( 'wp_ajax_wpfe_save_fields', array( $this, 'save_fields' ) );
        add_action( 'wp_ajax_wpfe_get_image_data', array( $this, 'get_image_data' ) );
        add_action( 'wp_ajax_wpfe_get_gallery_data', array( $this, 'get_gallery_data' ) );
        add_action( 'wp_ajax_wpfe_get_rendered_field', array( $this, 'get_rendered_field' ) );
        
        // Register REST API routes
        add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
    }

    /**
     * Register REST API routes.
     */
    public function register_rest_routes() {
        // Check if REST API is available (some hosts might disable it)
        if ( ! function_exists( 'register_rest_route' ) ) {
            return;
        }
        
        // Register the get-fields route with fallback for non-pretty permalinks
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

        // Register the save-fields route with improved security measures
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
                        },
                        'sanitize_callback' => 'absint',
                        'required' => true,
                    ),
                    'fields' => array(
                        'validate_callback' => function( $param ) {
                            // Validate that it's an array and doesn't contain potentially harmful values
                            if (!is_array($param)) {
                                return false;
                            }
                            
                            // Basic validation of array structure
                            foreach ($param as $key => $value) {
                                // Check keys are valid
                                if (!is_string($key) || preg_match('/[^a-zA-Z0-9_-]/', $key)) {
                                    return false;
                                }
                            }
                            
                            return true;
                        },
                        'sanitize_callback' => function( $param ) {
                            // Each field will be sanitized individually during processing
                            // but we can sanitize the keys here
                            $sanitized = array();
                            foreach ($param as $key => $value) {
                                $sanitized[sanitize_key($key)] = $value;
                            }
                            return $sanitized;
                        },
                        'required' => true,
                    ),
                    'nonce' => array(
                        'required' => true,
                        'validate_callback' => function( $param ) {
                            return is_string( $param ) && ! empty( $param );
                        }
                    )
                ),
            )
        );
        
        // Register a route for getting image data
        register_rest_route(
            'wp-frontend-editor/v1',
            '/get-image-data',
            array(
                'methods'             => 'GET',
                'callback'            => array( $this, 'rest_get_image_data' ),
                'permission_callback' => array( $this, 'rest_permissions_check' ),
                'args'                => array(
                    'attachment_id' => array(
                        'validate_callback' => function( $param ) {
                            return is_numeric( $param );
                        },
                        'sanitize_callback' => 'absint',
                        'required' => true,
                    ),
                ),
            )
        );
        
        // Register a route for getting gallery data
        register_rest_route(
            'wp-frontend-editor/v1',
            '/get-gallery-data',
            array(
                'methods'             => 'GET',
                'callback'            => array( $this, 'rest_get_gallery_data' ),
                'permission_callback' => array( $this, 'rest_permissions_check' ),
                'args'                => array(
                    'attachment_ids' => array(
                        'validate_callback' => function( $param ) {
                            return is_string( $param ) || is_array( $param );
                        },
                        'required' => true,
                    ),
                ),
            )
        );
        
        // Register a route for getting rendered fields
        register_rest_route(
            'wp-frontend-editor/v1',
            '/get-rendered-field',
            array(
                'methods'             => 'GET',
                'callback'            => array( $this, 'rest_get_rendered_field' ),
                'permission_callback' => array( $this, 'rest_permissions_check' ),
                'args'                => array(
                    'post_id' => array(
                        'validate_callback' => function( $param ) {
                            return is_numeric( $param );
                        },
                        'sanitize_callback' => 'absint',
                        'required' => true,
                    ),
                    'field_name' => array(
                        'validate_callback' => function( $param ) {
                            return is_string( $param ) && ! empty( $param );
                        },
                        'sanitize_callback' => 'sanitize_text_field',
                        'required' => true,
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
        // Additional nonce verification for REST
        $nonce = $request->get_param( 'nonce' );
        if ( ! wp_verify_nonce( $nonce, 'wpfe-editor-nonce' ) ) {
            return new WP_Error(
                'rest_forbidden',
                __( 'Security check failed', 'wp-frontend-editor' ),
                array( 'status' => 403 )
            );
        }
        
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
     * Get rendered field via REST API.
     *
     * @param WP_REST_Request $request The request object.
     * @return WP_REST_Response The response object.
     */
    public function rest_get_rendered_field( $request ) {
        $post_id = $request->get_param( 'post_id' );
        $field_name = $request->get_param( 'field_name' );
        
        // Buffer the output
        ob_start();
        
        if ( function_exists( 'get_field' ) ) {
            // For ACF fields
            $field_object = get_field_object( $field_name, $post_id );
            
            if ( $field_object ) {
                $value = get_field( $field_name, $post_id );
                
                // Handle different field types
                switch ( $field_object['type'] ) {
                    case 'repeater':
                        if ( have_rows( $field_name, $post_id ) ) {
                            echo '<div class="acf-repeater acf-repeater-' . esc_attr( $field_name ) . '">';
                            while ( have_rows( $field_name, $post_id ) ) { 
                                the_row();
                                echo '<div class="acf-repeater-row">';
                                
                                // Output each sub field within the repeater
                                foreach ( $field_object['sub_fields'] as $sub_field ) {
                                    $sub_value = get_sub_field( $sub_field['name'] );
                                    
                                    echo '<div class="acf-field acf-field-' . esc_attr( $sub_field['name'] ) . '">';
                                    
                                    if ( $sub_field['type'] === 'image' ) {
                                        // Special handling for images
                                        if ( $sub_value ) {
                                            echo wp_get_attachment_image( $sub_value, 'medium' );
                                        }
                                    } else {
                                        // Regular field output
                                        echo '<span class="acf-field-value">' . esc_html( is_array( $sub_value ) ? json_encode( $sub_value ) : $sub_value ) . '</span>';
                                    }
                                    
                                    echo '</div>';
                                }
                                
                                echo '</div>';
                            }
                            echo '</div>';
                        }
                        break;
                        
                    case 'flexible_content':
                        if ( have_rows( $field_name, $post_id ) ) {
                            echo '<div class="acf-flexible-content acf-flexible-' . esc_attr( $field_name ) . '">';
                            while ( have_rows( $field_name, $post_id ) ) { 
                                the_row();
                                $layout = get_row_layout();
                                
                                echo '<div class="acf-layout acf-layout-' . esc_attr( $layout ) . '">';
                                
                                // Get sub fields for this layout
                                $layout_fields = array();
                                foreach ( $field_object['layouts'] as $layout_obj ) {
                                    if ( $layout_obj['name'] === $layout ) {
                                        $layout_fields = $layout_obj['sub_fields'];
                                        break;
                                    }
                                }
                                
                                // Output each sub field within the layout
                                foreach ( $layout_fields as $sub_field ) {
                                    $sub_value = get_sub_field( $sub_field['name'] );
                                    
                                    echo '<div class="acf-field acf-field-' . esc_attr( $sub_field['name'] ) . '">';
                                    
                                    if ( $sub_field['type'] === 'image' ) {
                                        // Special handling for images
                                        if ( $sub_value ) {
                                            echo wp_get_attachment_image( $sub_value, 'medium' );
                                        }
                                    } else {
                                        // Regular field output
                                        echo '<span class="acf-field-value">' . esc_html( is_array( $sub_value ) ? json_encode( $sub_value ) : $sub_value ) . '</span>';
                                    }
                                    
                                    echo '</div>';
                                }
                                
                                echo '</div>';
                            }
                            echo '</div>';
                        }
                        break;
                        
                    default:
                        // For other field types, just output the value
                        if ( is_array( $value ) ) {
                            echo '<pre>' . esc_html( json_encode( $value, JSON_PRETTY_PRINT ) ) . '</pre>';
                        } else {
                            echo esc_html( $value );
                        }
                        break;
                }
            } else {
                // Try to get it as a custom field
                $value = get_post_meta( $post_id, $field_name, true );
                echo esc_html( $value );
            }
        } else {
            // Standard WP fields
            $post = get_post( $post_id );
            
            switch ( $field_name ) {
                case 'post_title':
                    echo esc_html( $post->post_title );
                    break;
                    
                case 'post_content':
                    echo apply_filters( 'the_content', $post->post_content );
                    break;
                    
                case 'post_excerpt':
                    echo esc_html( $post->post_excerpt );
                    break;
                    
                default:
                    // Try as a custom field
                    $value = get_post_meta( $post_id, $field_name, true );
                    echo esc_html( $value );
                    break;
            }
        }
        
        $output = ob_get_clean();
        
        return rest_ensure_response( array(
            'success' => true,
            'html' => $output,
        ) );
    }
    
    /**
     * Get image data via REST API.
     *
     * @param WP_REST_Request $request The request object.
     * @return WP_REST_Response The response object.
     */
    public function rest_get_image_data( $request ) {
        $attachment_id = $request->get_param( 'attachment_id' );
        
        // Get image data
        $full_image_url = wp_get_attachment_url( $attachment_id );
        $large_image_data = wp_get_attachment_image_src( $attachment_id, 'large' );
        $thumbnail_image_data = wp_get_attachment_image_src( $attachment_id, 'thumbnail' );
        $srcset = wp_get_attachment_image_srcset( $attachment_id, 'large' );
        $sizes = wp_get_attachment_image_sizes( $attachment_id, 'large' );
        
        return rest_ensure_response( array(
            'success' => true,
            'data' => array(
                'id'     => $attachment_id,
                'url'    => $large_image_data ? $large_image_data[0] : $full_image_url,
                'width'  => $large_image_data ? $large_image_data[1] : null,
                'height' => $large_image_data ? $large_image_data[2] : null,
                'full'   => $full_image_url,
                'thumbnail_url' => $thumbnail_image_data ? $thumbnail_image_data[0] : $full_image_url,
                'srcset' => $srcset,
                'sizes'  => $sizes,
            )
        ) );
    }
    
    /**
     * Get gallery data via REST API.
     *
     * @param WP_REST_Request $request The request object.
     * @return WP_REST_Response The response object.
     */
    public function rest_get_gallery_data( $request ) {
        $attachment_ids = $request->get_param( 'attachment_ids' );
        
        // Parse the attachment IDs
        if ( is_string( $attachment_ids ) ) {
            if ( strpos( $attachment_ids, '[' ) === 0 ) {
                // Try to parse JSON
                $attachment_ids = json_decode( stripslashes( $attachment_ids ), true );
            } else {
                // Comma-separated list
                $attachment_ids = array_map( 'absint', explode( ',', $attachment_ids ) );
            }
        }
        
        if ( ! is_array( $attachment_ids ) || empty( $attachment_ids ) ) {
            return new WP_Error(
                'wpfe_invalid_attachments',
                __( 'Invalid attachment IDs', 'wp-frontend-editor' ),
                array( 'status' => 400 )
            );
        }
        
        $gallery_data = array();
        
        foreach ( $attachment_ids as $attachment_id ) {
            $attachment_id = absint( $attachment_id );
            
            if ( ! $attachment_id ) {
                continue;
            }
            
            // Get attachment info
            $attachment = get_post( $attachment_id );
            
            if ( ! $attachment ) {
                continue;
            }
            
            // Get image URLs
            $full_url = wp_get_attachment_url( $attachment_id );
            $thumbnail_data = wp_get_attachment_image_src( $attachment_id, 'thumbnail' );
            $thumbnail_url = $thumbnail_data ? $thumbnail_data[0] : $full_url;
            
            // Get alt text
            $alt_text = get_post_meta( $attachment_id, '_wp_attachment_image_alt', true );
            
            $gallery_data[] = array(
                'id' => $attachment_id,
                'url' => $full_url,
                'thumbnail_url' => $thumbnail_url,
                'title' => $attachment->post_title,
                'caption' => $attachment->post_excerpt,
                'alt' => $alt_text,
            );
        }
        
        return rest_ensure_response( array(
            'success' => true,
            'data' => array(
                'images' => $gallery_data,
            )
        ) );
    }

    /**
     * AJAX handler for getting fields.
     */
    public function get_fields() {
        // Check nonce - use wp_die to immediately terminate on failure
        check_ajax_referer( 'wpfe-editor-nonce', 'nonce', true );

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
        // Check nonce - use wp_die to immediately terminate on failure
        check_ajax_referer( 'wpfe-editor-nonce', 'nonce', true );

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
     * Get field data from a post.
     *
     * Retrieves field data including core WordPress fields, ACF fields, and custom meta fields.
     * Can handle both single fields and multiple fields with proper type detection.
     *
     * @since 1.0.0
     * @param int          $post_id The post ID.
     * @param string|array $fields The field names to get. Use 'all' to get default fields.
     * @return array The field data with values, types, and metadata.
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
                    
                case 'categories':
                case 'post_categories':
                    // Get all categories
                    $categories = get_categories(array(
                        'hide_empty' => false,
                        'orderby' => 'name',
                        'order' => 'ASC'
                    ));
                    
                    // Get post categories
                    $post_categories = wp_get_post_categories($post_id, array('fields' => 'ids'));
                    
                    // Format categories for the UI with hierarchy
                    $category_options = array();
                    foreach ($categories as $category) {
                        $category_options[] = array(
                            'value' => $category->term_id,
                            'label' => $category->name,
                            'count' => $category->count,
                            'parent' => $category->parent
                        );
                    }
                    
                    $data['post_categories'] = array(
                        'value' => $post_categories,
                        'type'  => 'taxonomy',
                        'taxonomy' => 'category',
                        'options' => $category_options,
                        'label' => __( 'Categories', 'wp-frontend-editor' ),
                        'hierarchical' => true
                    );
                    break;
                    
                case 'tags':
                case 'post_tags':
                    // Get all tags
                    $tags = get_tags(array(
                        'hide_empty' => false,
                        'orderby' => 'name',
                        'order' => 'ASC'
                    ));
                    
                    // Get post tags
                    $post_tags = wp_get_post_tags($post_id, array('fields' => 'ids'));
                    
                    // Format tags for the UI
                    $tag_options = array();
                    foreach ($tags as $tag) {
                        $tag_options[] = array(
                            'value' => $tag->term_id,
                            'label' => $tag->name,
                            'count' => $tag->count
                        );
                    }
                    
                    $data['post_tags'] = array(
                        'value' => $post_tags,
                        'type'  => 'taxonomy',
                        'taxonomy' => 'post_tag',
                        'options' => $tag_options,
                        'label' => __( 'Tags', 'wp-frontend-editor' ),
                        'hierarchical' => false
                    );
                    break;

                default:
                    // Check if it's an ACF field
                    if ( class_exists( 'ACF' ) && function_exists( 'get_field' ) && function_exists( 'acf_get_field' ) ) {
                        // Check if field exists - try different methods to get the field
                        $acf_field = null;
                        
                        // Try getting field by key directly
                        if (strpos($field, 'field_') === 0) {
                            $acf_field = acf_get_field($field);
                        }
                        
                        // If that fails, try looking up by name
                        if (!$acf_field) {
                            // Try to find field by name
                            $potential_field = $this->find_acf_field_by_name($field);
                            if ($potential_field) {
                                $acf_field = $potential_field;
                            }
                        }
                        
                        if ( $acf_field ) {
                            // Get field value - make sure to use the field key, not name
                            $field_value = get_field( $acf_field['key'], $post_id, false );
                            
                            // Add field-specific data for special field types
                            $extra_data = array();
                            
                            // Process value based on field type
                            switch ($acf_field['type']) {
                                case 'image':
                                    // For image fields, ensure we have the URL for preview
                                    if (is_array($field_value)) {
                                        $extra_data['url'] = isset($field_value['url']) ? $field_value['url'] : '';
                                    } else if (is_numeric($field_value)) {
                                        $extra_data['url'] = wp_get_attachment_url($field_value);
                                    }
                                    break;
                                    
                                case 'gallery':
                                    // For gallery fields, ensure we have URLs for previews
                                    if (is_array($field_value)) {
                                        $gallery_items = array();
                                        foreach ($field_value as $item) {
                                            if (is_array($item)) {
                                                $gallery_items[] = array(
                                                    'id' => isset($item['id']) ? $item['id'] : $item['ID'],
                                                    'url' => isset($item['url']) ? $item['url'] : $item['sizes']['thumbnail']
                                                );
                                            } else if (is_numeric($item)) {
                                                $gallery_items[] = array(
                                                    'id' => $item,
                                                    'url' => wp_get_attachment_image_url($item, 'thumbnail')
                                                );
                                            }
                                        }
                                        $extra_data['gallery_items'] = $gallery_items;
                                    }
                                    break;
                                    
                                case 'select':
                                case 'checkbox':
                                case 'radio':
                                    // Make sure options are properly formatted
                                    if (isset($acf_field['choices']) && is_array($acf_field['choices'])) {
                                        $options = array();
                                        foreach ($acf_field['choices'] as $value => $label) {
                                            $options[] = array(
                                                'value' => $value,
                                                'label' => $label
                                            );
                                        }
                                        $extra_data['options'] = $options;
                                    }
                                    
                                    // For select fields, check if it's multiple
                                    if ($acf_field['type'] === 'select') {
                                        $extra_data['multiple'] = isset($acf_field['multiple']) && $acf_field['multiple'];
                                    }
                                    break;
                                
                                case 'relationship':
                                case 'post_object':
                                    // Get post type(s) from field config
                                    $post_types = isset($acf_field['post_type']) ? $acf_field['post_type'] : array('post');
                                    if (empty($post_types)) {
                                        $post_types = array('post', 'page');
                                    }
                                    
                                    // Get option value from field settings or use default
                                    $posts_per_page = isset($acf_field['posts_per_page']) ? (int)$acf_field['posts_per_page'] : 100;
                                    
                                    // Use filter to allow developers to modify this limit
                                    $posts_per_page = apply_filters('wpfe_relationship_posts_per_page', $posts_per_page, $field_name, $acf_field);
                                    
                                    // Cap at a reasonable number
                                    $posts_per_page = min(500, max(20, $posts_per_page));
                                    
                                    // Get the available posts
                                    $posts = get_posts(array(
                                        'post_type' => $post_types,
                                        'posts_per_page' => $posts_per_page,
                                        'post_status' => 'publish',
                                        'orderby' => 'title',
                                        'order' => 'ASC'
                                    ));
                                    
                                    // Format posts for the UI
                                    $post_options = array();
                                    foreach ($posts as $post_obj) {
                                        $post_options[] = array(
                                            'id' => $post_obj->ID,
                                            'title' => $post_obj->post_title,
                                            'type' => $post_obj->post_type,
                                            'date' => get_the_date('Y-m-d', $post_obj->ID)
                                        );
                                    }
                                    
                                    $extra_data['post_options'] = $post_options;
                                    $extra_data['max'] = isset($acf_field['max']) ? $acf_field['max'] : 0;
                                    $extra_data['min'] = isset($acf_field['min']) ? $acf_field['min'] : 0;
                                    $extra_data['multiple'] = isset($acf_field['multiple']) && $acf_field['multiple'];
                                    break;
                            }
                            
                            // Include key ACF-specific metadata
                            $data[ $acf_field['key'] ] = array(
                                'value' => $field_value,
                                'type'  => $acf_field['type'],
                                'label' => $acf_field['label'],
                                'required' => !empty($acf_field['required']),
                                'instructions' => isset($acf_field['instructions']) ? $acf_field['instructions'] : '',
                            );
                            
                            // Merge extra data if available
                            if (!empty($extra_data)) {
                                $data[$acf_field['key']] = array_merge($data[$acf_field['key']], $extra_data);
                            }
                        }
                    }
                    }
                    break;
            }
        }

        return $data;
    }
    
    /**
     * Find an ACF field by name
     *
     * @param string $field_name The field name to find
     * @return array|false The ACF field array or false if not found
     */
    private function find_acf_field_by_name($field_name) {
        if (!function_exists('acf_get_field_groups') || !function_exists('acf_get_fields')) {
            return false;
        }
        
        // Check if we can get it directly first (most efficient method)
        $field = acf_get_field( $field_name );
        if ( $field && isset( $field['name'] ) && $field['name'] === $field_name ) {
            return $field;
        }
        
        // Get all field groups 
        $field_groups = acf_get_field_groups();
        
        if (empty($field_groups)) {
            return false;
        }
        
        // Loop through all field groups and their fields - with a caching layer
        static $field_cache = array();
        
        // If we've already looked up this field, return from cache
        if (isset($field_cache[$field_name])) {
            return $field_cache[$field_name];
        }
        
        // Limit cache size to prevent memory issues
        if (count($field_cache) > 100) {
            // Clear oldest 50 items
            $field_cache = array_slice($field_cache, 50, null, true);
        }
        
        foreach ($field_groups as $field_group) {
            $fields = acf_get_fields($field_group);
            
            if (empty($fields)) {
                continue;
            }
            
            foreach ($fields as $field) {
                // Check if field name matches
                if (isset($field['name']) && $field['name'] === $field_name) {
                    $field_cache[$field_name] = $field;
                    return $field;
                }
                
                // For repeater and flexible content fields, check sub-fields
                if (in_array($field['type'], array('repeater', 'flexible_content', 'group'), true)) {
                    $sub_field = $this->find_field_in_subfields($field, $field_name, 1);
                    if ($sub_field) {
                        $field_cache[$field_name] = $sub_field;
                        return $sub_field;
                    }
                }
            }
        }
        
        // If no field found, cache false result
        $field_cache[$field_name] = false;
        return false;
    }
    
    /**
     * Recursively search for a field in subfields of complex field types
     *
     * @param array $field The parent field
     * @param string $field_name The field name to find
     * @param int $depth Current recursion depth
     * @param int $max_depth Maximum recursion depth to prevent performance issues
     * @return array|false The field array or false if not found
     */
    private function find_field_in_subfields($field, $field_name, $depth = 0, $max_depth = 3) {
        // Prevent excessive recursion depth
        if ($depth >= $max_depth) {
            return false;
        }
        
        if ($field['type'] === 'repeater' && isset($field['sub_fields'])) {
            foreach ($field['sub_fields'] as $sub_field) {
                if (isset($sub_field['name']) && $sub_field['name'] === $field_name) {
                    return $sub_field;
                }
                
                // Recursive search
                if (in_array($sub_field['type'], array('repeater', 'flexible_content', 'group'), true)) {
                    $result = $this->find_field_in_subfields($sub_field, $field_name, $depth + 1, $max_depth);
                    if ($result) {
                        return $result;
                    }
                }
            }
        } elseif ($field['type'] === 'flexible_content' && isset($field['layouts'])) {
            foreach ($field['layouts'] as $layout) {
                if (isset($layout['sub_fields'])) {
                    foreach ($layout['sub_fields'] as $sub_field) {
                        if (isset($sub_field['name']) && $sub_field['name'] === $field_name) {
                            return $sub_field;
                        }
                        
                        // Recursive search
                        if (in_array($sub_field['type'], array('repeater', 'flexible_content', 'group'), true)) {
                            $result = $this->find_field_in_subfields($sub_field, $field_name, $depth + 1, $max_depth);
                            if ($result) {
                                return $result;
                            }
                        }
                    }
                }
            }
        } elseif ($field['type'] === 'group' && isset($field['sub_fields'])) {
            foreach ($field['sub_fields'] as $sub_field) {
                if (isset($sub_field['name']) && $sub_field['name'] === $field_name) {
                    return $sub_field;
                }
                
                // Recursive search
                if (in_array($sub_field['type'], array('repeater', 'flexible_content', 'group'), true)) {
                    $result = $this->find_field_in_subfields($sub_field, $field_name, $depth + 1, $max_depth);
                    if ($result) {
                        return $result;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Process ACF field value for saving based on field type
     *
     * @param array $field The ACF field configuration
     * @param mixed $value The value to process
     * @return mixed The processed value
     */
    private function process_acf_value_for_saving($field, $value) {
        // If no value, just return it
        if ($value === null || $value === '') {
            return $value;
        }
        
        switch ($field['type']) {
            case 'image':
            case 'file':
                // For image/file fields, make sure we get the ID
                if (is_array($value) && isset($value['id'])) {
                    return absint($value['id']);
                } else if (is_numeric($value)) {
                    return absint($value);
                }
                break;
                
            case 'gallery':
                // For gallery fields, make sure we return an array of IDs
                if (is_array($value)) {
                    $ids = array();
                    
                    foreach ($value as $item) {
                        if (is_array($item) && isset($item['id'])) {
                            $ids[] = absint($item['id']);
                        } else if (is_numeric($item)) {
                            $ids[] = absint($item);
                        }
                    }
                    
                    return $ids;
                }
                break;
                
            case 'checkbox':
                // Make sure checkboxes are arrays and sanitize each value
                if (!is_array($value)) {
                    return array(sanitize_text_field($value));
                } else {
                    return array_map('sanitize_text_field', $value);
                }
                break;
                
            case 'true_false':
                // Convert to boolean-like value
                return $value ? 1 : 0;
                
            case 'date_picker':
            case 'date_time_picker':
            case 'time_picker':
                // Ensure date format is correct and sanitize
                if (!empty($value)) {
                    // For date_picker, ensures the date is in YYYYMMDD format
                    // For date_time_picker, ensures the date is in YYYY-MM-DD HH:MM:SS format
                    // For time_picker, ensures the time is in HH:MM:SS format
                    return sanitize_text_field($value);
                }
                break;
                
            case 'repeater':
            case 'flexible_content':
                // These complex fields should be handled by ACF directly
                // We should still sanitize the value array if provided
                if (is_array($value)) {
                    // We can't manually sanitize these complex structures
                    // but we can ensure it's a valid array structure
                    array_walk_recursive($value, function(&$item) {
                        if (is_string($item)) {
                            $item = sanitize_text_field($item);
                        } elseif (is_numeric($item)) {
                            $item = is_int($item) ? absint($item) : floatval($item);
                        }
                    });
                }
                return $value;
                break;
                
            case 'relationship':
            case 'post_object':
                // For relationship fields, make sure we return an array of IDs
                if (is_array($value)) {
                    return array_map('absint', $value);
                } else if (is_numeric($value)) {
                    return absint($value);
                }
                break;
                
            case 'taxonomy':
                // For taxonomy fields, make sure we return an array of term IDs
                if (is_array($value)) {
                    return array_map('absint', $value);
                } else if (is_numeric($value)) {
                    return absint($value);
                }
                break;
                
            case 'wysiwyg':
                // For WYSIWYG fields, apply appropriate sanitization
                return wp_kses_post($value);
                
            case 'textarea':
                // For textarea fields, apply appropriate sanitization
                return sanitize_textarea_field($value);
                
            case 'url':
                // For URL fields, use esc_url_raw
                return esc_url_raw($value);
                
            case 'email':
                // For email fields, use sanitize_email
                return sanitize_email($value);
                
            default:
                // For most fields, sanitize as text
                if (is_string($value)) {
                    return sanitize_text_field($value);
                } elseif (is_array($value)) {
                    return array_map('sanitize_text_field', $value);
                }
                break;
        }
        
        return $value;
    }

    /**
     * Save field data to a post.
     *
     * Handles saving multiple field types including core WordPress fields,
     * ACF fields with proper type handling, and regular post meta.
     * Provides robust error reporting for troubleshooting.
     *
     * @since 1.0.0
     * @param int   $post_id The post ID.
     * @param array $fields Associative array of fields to save (field_name => value).
     * @return array|WP_Error The updated fields or a WP_Error with detailed error messages.
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
                    
                case 'post_categories':
                    // Handle categories (expects array of term IDs)
                    if (is_array($value)) {
                        $term_ids = array_map('absint', $value);
                        wp_set_post_categories($post_id, $term_ids);
                        $updated_fields['post_categories'] = $term_ids;
                    }
                    break;
                    
                case 'post_tags':
                    // Handle tags (expects array of term IDs)
                    if (is_array($value)) {
                        $term_ids = array_map('absint', $value);
                        
                        // Convert term IDs to tag names (WordPress expects tag names for wp_set_post_tags)
                        $tag_names = array();
                        foreach ($term_ids as $term_id) {
                            $tag = get_term($term_id, 'post_tag');
                            if ($tag && !is_wp_error($tag)) {
                                $tag_names[] = $tag->name;
                            }
                        }
                        
                        // Replace all existing tags
                        wp_set_post_tags($post_id, $tag_names, false);
                        $updated_fields['post_tags'] = $term_ids;
                    }
                    break;

                default:
                    // Check if it's an ACF field
                    if ( class_exists( 'ACF' ) && function_exists( 'update_field' ) ) {
                        $acf_field = null;
                        
                        // Try getting field by key directly
                        if (strpos($field_name, 'field_') === 0) {
                            $acf_field = acf_get_field($field_name);
                        }
                        
                        // If that fails, try looking up by name
                        if (!$acf_field) {
                            // Try to find field by name
                            $potential_field = $this->find_acf_field_by_name($field_name);
                            if ($potential_field) {
                                $acf_field = $potential_field;
                                // Use the key, not the name for updating
                                $field_name = $acf_field['key'];
                            }
                        }
                        
                        if ( $acf_field ) {
                            // Check if this is an unsupported field type
                            $unsupported_types = array('message');
                            if (in_array($acf_field['type'], $unsupported_types)) {
                                $errors[] = sprintf(
                                    /* translators: %1$s: field name, %2$s: field type */
                                    __( 'Field type "%2$s" is not supported: %1$s', 'wp-frontend-editor' ),
                                    $acf_field['label'],
                                    $acf_field['type']
                                );
                            } else {
                                // Process value based on ACF field type
                                $processed_value = $this->process_acf_value_for_saving($acf_field, $value);
                                
                                $update_success = false;
                                
                                // Special handling for complex field types that may need more processing
                                if ($acf_field['type'] === 'clone') {
                                    // For clone fields, we need to update each subfield individually
                                    $update_success = true; // Assume success initially
                                    
                                    if (isset($acf_field['sub_fields']) && is_array($acf_field['sub_fields'])) {
                                        foreach ($acf_field['sub_fields'] as $sub_field) {
                                            if (isset($processed_value[$sub_field['name']])) {
                                                $sub_updated = update_field(
                                                    $sub_field['key'], 
                                                    $processed_value[$sub_field['name']], 
                                                    $post_id
                                                );
                                                
                                                if (!$sub_updated) {
                                                    $update_success = false;
                                                    $errors[] = sprintf(
                                                        /* translators: %s: field name */
                                                        __( 'Failed to update cloned subfield: %s', 'wp-frontend-editor' ),
                                                        $sub_field['label']
                                                    );
                                                }
                                            }
                                        }
                                    } else {
                                        // If we don't have explicit subfields, try updating directly
                                        $update_success = update_field($field_name, $processed_value, $post_id);
                                    }
                                } else {
                                    // For standard fields, just update directly
                                    $update_success = update_field($field_name, $processed_value, $post_id);
                                }
                                
                                if ($update_success) {
                                    $updated_fields[$field_name] = $processed_value;
                                } else {
                                    $errors[] = sprintf(
                                        /* translators: %s: field name */
                                        __( 'Failed to update ACF field: %s', 'wp-frontend-editor' ),
                                        $acf_field['label']
                                    );
                                }
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

        // If there are errors, return them with detailed information
        if ( ! empty( $errors ) ) {
            $error = new WP_Error('wpfe_save_error', 'Errors occurred while saving fields.');
            
            // Add each error as a separate data point for detailed reporting
            foreach ($errors as $index => $error_message) {
                $error->add('wpfe_error_' . $index, $error_message);
            }
            
            // Also add a concatenated version for backward compatibility
            $error->add_data(array(
                'errors' => $errors,
                'message' => implode('. ', $errors),
                'fields_updated' => $updated_fields
            ));
            
            return $error;
        }

        return $updated_fields;
    }
    
    /**
     * Get image data for a specified attachment.
     * 
     * Used to update featured images without page reload.
     * 
     * @return void
     */
    public function get_image_data() {
        // Check nonce - use wp_die to immediately terminate on failure
        check_ajax_referer( 'wpfe-editor-nonce', 'nonce', true );
        
        // Get attachment ID
        $attachment_id = isset( $_GET['attachment_id'] ) ? intval( $_GET['attachment_id'] ) : 0;
        
        if ( ! $attachment_id ) {
            wp_send_json_error( array(
                'message' => __( 'Invalid attachment ID', 'wp-frontend-editor' ),
            ) );
        }
        
        // Check if attachment exists and user has permissions
        $attachment = get_post($attachment_id);
        if (!$attachment || $attachment->post_type !== 'attachment') {
            wp_send_json_error( array(
                'message' => __( 'Attachment not found', 'wp-frontend-editor' ),
            ) );
        }
        
        // Verify user has permission to view this attachment
        if (!current_user_can('edit_post', $attachment_id) && !current_user_can('edit_posts')) {
            wp_send_json_error( array(
                'message' => __( 'You do not have permission to access this attachment', 'wp-frontend-editor' ),
            ) );
        }
        
        // Get image data
        $full_image_url = wp_get_attachment_url( $attachment_id );
        $large_image_data = wp_get_attachment_image_src( $attachment_id, 'large' );
        $thumbnail_image_data = wp_get_attachment_image_src( $attachment_id, 'thumbnail' );
        $srcset = wp_get_attachment_image_srcset( $attachment_id, 'large' );
        $sizes = wp_get_attachment_image_sizes( $attachment_id, 'large' );
        
        // Return image data
        wp_send_json_success( array(
            'id'     => $attachment_id,
            'url'    => $large_image_data ? $large_image_data[0] : $full_image_url,
            'width'  => $large_image_data ? $large_image_data[1] : null,
            'height' => $large_image_data ? $large_image_data[2] : null,
            'full'   => $full_image_url,
            'thumbnail_url' => $thumbnail_image_data ? $thumbnail_image_data[0] : $full_image_url,
            'srcset' => $srcset,
            'sizes'  => $sizes,
        ) );
    }
    
    /**
     * Get gallery data for multiple attachments.
     * 
     * Used to get thumbnail data for gallery fields.
     * 
     * @since 1.0.0
     * @return void
     */
    public function get_gallery_data() {
        // Check nonce - use wp_die to immediately terminate on failure
        check_ajax_referer( 'wpfe-editor-nonce', 'nonce', true );
        
        // Get attachment IDs
        $attachment_ids = isset( $_GET['attachment_ids'] ) ? $_GET['attachment_ids'] : '';
        
        // Parse the attachment IDs
        if ( is_string( $attachment_ids ) ) {
            if ( strpos( $attachment_ids, '[' ) === 0 ) {
                // Try to parse JSON with security check to prevent object injection
                $attachment_ids = json_decode( stripslashes( $attachment_ids ), true );
                
                // Verify it's a proper array after decoding
                if (!is_array($attachment_ids)) {
                    $attachment_ids = array();
                }
            } else {
                // Comma-separated list
                $attachment_ids = array_map( 'absint', explode( ',', $attachment_ids ) );
            }
        }
        
        // Validate the array
        if ( ! is_array( $attachment_ids ) || empty( $attachment_ids ) ) {
            wp_send_json_error( array(
                'message' => __( 'Invalid attachment IDs', 'wp-frontend-editor' ),
            ) );
        }
        
        // Limit the number of items for performance
        $attachment_ids = array_slice($attachment_ids, 0, 50);
        
        $gallery_data = array();
        
        foreach ( $attachment_ids as $attachment_id ) {
            $attachment_id = absint( $attachment_id );
            
            if ( ! $attachment_id ) {
                continue;
            }
            
            // Get attachment info
            $attachment = get_post( $attachment_id );
            
            if ( ! $attachment || $attachment->post_type !== 'attachment' ) {
                continue;
            }
            
            // Verify user has permission to view this attachment
            if (!current_user_can('edit_post', $attachment_id) && !current_user_can('edit_posts')) {
                continue;
            }
            
            // Get image URLs
            $full_url = wp_get_attachment_url( $attachment_id );
            $thumbnail_data = wp_get_attachment_image_src( $attachment_id, 'thumbnail' );
            $thumbnail_url = $thumbnail_data ? $thumbnail_data[0] : $full_url;
            
            // Get alt text
            $alt_text = get_post_meta( $attachment_id, '_wp_attachment_image_alt', true );
            
            $gallery_data[] = array(
                'id' => $attachment_id,
                'url' => $full_url,
                'thumbnail_url' => $thumbnail_url,
                'title' => $attachment->post_title,
                'caption' => $attachment->post_excerpt,
                'alt' => $alt_text,
            );
        }
        
        wp_send_json_success( array(
            'images' => $gallery_data,
        ) );
    }
    
    /**
     * Helper function to properly render ACF field values based on type
     * 
     * Renders all ACF field types with appropriate formatting and security measures.
     * Mimics the backend display of ACF fields in the WordPress admin.
     * 
     * @since 1.0.1
     * @param mixed $value The field value
     * @param array $field_data The field configuration data
     * @return string The properly formatted HTML output
     */
    private function render_field_value($value, $field_data) {
        if (!isset($field_data['type'])) {
            return esc_html(is_array($value) ? json_encode($value) : $value);
        }
        
        // No value - display placeholder message
        if ($value === null || $value === '' || (is_array($value) && empty($value))) {
            return '<span class="acf-empty-value">' . esc_html__('(No value)', 'wp-frontend-editor') . '</span>';
        }
        
        switch ($field_data['type']) {
            // Basic Fields
            case 'text':
            case 'number':
            case 'range':
            case 'password':
                return esc_html($value);
                
            case 'textarea':
                return nl2br(esc_html($value));
                
            case 'wysiwyg':
                return wp_kses_post($value);
                
            case 'oembed':
                if (function_exists('wp_oembed_get')) {
                    $embed = wp_oembed_get($value);
                    return $embed ? $embed : esc_html($value);
                }
                return esc_html($value);
                
            case 'email':
                $email = sanitize_email($value);
                return '<a href="mailto:' . esc_attr($email) . '">' . esc_html($email) . '</a>';
                
            case 'url':
                return '<a href="' . esc_url($value) . '" target="_blank">' . esc_html($value) . '</a>';
                
            // Complex Fields - Images & Files
            case 'image':
                if ($value && is_numeric($value)) {
                    return wp_get_attachment_image($value, 'medium');
                } elseif (is_array($value) && isset($value['ID'])) {
                    return wp_get_attachment_image($value['ID'], 'medium');
                }
                return '';
                
            case 'file':
                if ($value && is_numeric($value)) {
                    $url = wp_get_attachment_url($value);
                    $filename = basename($url);
                    return '<a href="' . esc_url($url) . '" target="_blank" class="acf-file-item">' . esc_html($filename) . '</a>';
                } elseif (is_array($value) && isset($value['url'])) {
                    $filename = basename($value['url']);
                    return '<a href="' . esc_url($value['url']) . '" target="_blank" class="acf-file-item">' . 
                           (isset($value['title']) ? esc_html($value['title']) : esc_html($filename)) . '</a>';
                }
                return '';
                
            case 'gallery':
                if (is_array($value)) {
                    $output = '<div class="acf-gallery-display">';
                    foreach ($value as $image_id) {
                        $id = is_array($image_id) && isset($image_id['ID']) ? $image_id['ID'] : $image_id;
                        if (is_numeric($id)) {
                            $output .= '<div class="acf-gallery-item">' . wp_get_attachment_image($id, 'thumbnail') . '</div>';
                        }
                    }
                    $output .= '</div>';
                    return $output;
                }
                return '';
                
            // Selection Fields
            case 'select':
            case 'checkbox':
            case 'radio':
            case 'button_group':
                if (is_array($value)) {
                    // For multi-select or checkbox
                    $labels = array();
                    
                    // If we have the choices array in field_data, use it to get labels
                    if (isset($field_data['choices']) && is_array($field_data['choices'])) {
                        foreach ($value as $key) {
                            if (isset($field_data['choices'][$key])) {
                                $labels[] = esc_html($field_data['choices'][$key]);
                            } else {
                                $labels[] = esc_html($key);
                            }
                        }
                    } else {
                        // Just display the values
                        foreach ($value as $key) {
                            $labels[] = esc_html($key);
                        }
                    }
                    return implode(', ', $labels);
                } else {
                    // For single select, radio, etc.
                    if (isset($field_data['choices']) && is_array($field_data['choices']) && isset($field_data['choices'][$value])) {
                        return esc_html($field_data['choices'][$value]);
                    }
                    return esc_html($value);
                }
                
            case 'true_false':
                return $value ? __('Yes', 'wp-frontend-editor') : __('No', 'wp-frontend-editor');
                
            // Date & Time Fields
            case 'date_picker':
                // Format the date according to WordPress settings
                if (!empty($value)) {
                    $date_format = get_option('date_format', 'F j, Y');
                    return esc_html(date_i18n($date_format, strtotime($value)));
                }
                return '';
                
            case 'date_time_picker':
                // Format the date and time according to WordPress settings
                if (!empty($value)) {
                    $date_format = get_option('date_format', 'F j, Y');
                    $time_format = get_option('time_format', 'g:i a');
                    return esc_html(date_i18n("$date_format $time_format", strtotime($value)));
                }
                return '';
                
            case 'time_picker':
                // Format the time according to WordPress settings
                if (!empty($value)) {
                    $time_format = get_option('time_format', 'g:i a');
                    return esc_html(date_i18n($time_format, strtotime($value)));
                }
                return '';
                
            case 'color_picker':
                return '<span class="acf-color-indicator" style="background-color:' . esc_attr($value) . '"></span> ' . esc_html($value);
                
            // Relationship Fields
            case 'link':
                if (is_array($value) && isset($value['url'])) {
                    $target = isset($value['target']) ? $value['target'] : '_self';
                    $title = isset($value['title']) ? $value['title'] : $value['url'];
                    return '<a href="' . esc_url($value['url']) . '" target="' . esc_attr($target) . '" class="acf-link">' . esc_html($title) . '</a>';
                }
                return '';
                
            case 'post_object':
            case 'relationship':
            case 'page_link':
                if (is_array($value)) {
                    $titles = array();
                    foreach ($value as $post_id) {
                        $post_title = get_the_title($post_id);
                        $titles[] = $post_title ? esc_html($post_title) : esc_html("#$post_id");
                    }
                    return implode(', ', $titles);
                } elseif (is_numeric($value)) {
                    $post_title = get_the_title($value);
                    return $post_title ? esc_html($post_title) : esc_html("#$value");
                }
                return '';
                
            case 'taxonomy':
                if (is_array($value) && isset($field_data['taxonomy'])) {
                    $terms = array();
                    foreach ($value as $term_id) {
                        $term = get_term($term_id, $field_data['taxonomy']);
                        if ($term && !is_wp_error($term)) {
                            $terms[] = esc_html($term->name);
                        }
                    }
                    return implode(', ', $terms);
                } elseif (is_numeric($value) && isset($field_data['taxonomy'])) {
                    $term = get_term($value, $field_data['taxonomy']);
                    if ($term && !is_wp_error($term)) {
                        return esc_html($term->name);
                    }
                }
                return '';
                
            case 'user':
                if (is_array($value)) {
                    $names = array();
                    foreach ($value as $user_id) {
                        $user = get_userdata($user_id);
                        if ($user) {
                            $names[] = esc_html($user->display_name);
                        }
                    }
                    return implode(', ', $names);
                } elseif (is_numeric($value)) {
                    $user = get_userdata($value);
                    if ($user) {
                        return esc_html($user->display_name);
                    }
                }
                return '';
                
            case 'google_map':
                if (is_array($value) && isset($value['address'])) {
                    return '<div class="acf-map-display">' . 
                           '<span class="acf-map-address">' . esc_html($value['address']) . '</span>' .
                           (isset($value['lat']) && isset($value['lng']) ? 
                            '<span class="acf-map-coords">(' . esc_html($value['lat']) . ', ' . esc_html($value['lng']) . ')</span>' : '') .
                           '</div>';
                }
                return '';
                
            // Default handling for other field types and arrays
            default:
                if (is_array($value)) {
                    return '<pre class="acf-json-data">' . esc_html(json_encode($value, JSON_PRETTY_PRINT)) . '</pre>';
                }
                return esc_html($value);
        }
    }
    
    /**
     * Render a repeater field with proper formatting
     * 
     * @since 1.0.1
     * @param string $field_name The field name
     * @param int $post_id The post ID
     * @param array $field_object The ACF field object
     * @return string The HTML output
     */
    private function render_acf_repeater($field_name, $post_id, $field_object) {
        ob_start();
        
        if (have_rows($field_name, $post_id)) {
            echo '<div class="acf-repeater acf-repeater-' . esc_attr($field_name) . '">';
            
            // Add a header row with labels for clarity
            echo '<div class="acf-repeater-header">';
            foreach ($field_object['sub_fields'] as $sub_field) {
                echo '<div class="acf-repeater-header-label">' . esc_html($sub_field['label']) . '</div>';
            }
            echo '</div>';
            
            $row_count = 0;
            while (have_rows($field_name, $post_id)) { 
                the_row();
                $row_count++;
                echo '<div class="acf-repeater-row" data-row="' . esc_attr($row_count) . '">';
                
                // Output each sub field within the repeater
                foreach ($field_object['sub_fields'] as $sub_field) {
                    $sub_value = get_sub_field($sub_field['name']);
                    
                    echo '<div class="acf-field acf-field-' . esc_attr($sub_field['name']) . ' acf-field-type-' . esc_attr($sub_field['type']) . '">';
                    
                    // Add label for mobile view
                    echo '<div class="acf-field-label">' . esc_html($sub_field['label']) . '</div>';
                    
                    echo '<div class="acf-field-value-wrap">';
                    // Use our enhanced render_field_value method
                    echo $this->render_field_value($sub_value, $sub_field);
                    echo '</div>';
                    
                    echo '</div>';
                }
                
                echo '</div>';
            }
            
            if ($row_count === 0) {
                echo '<div class="acf-empty-repeater">' . esc_html__('No rows found', 'wp-frontend-editor') . '</div>';
            }
            
            echo '</div>';
        } else {
            echo '<div class="acf-empty-repeater">' . esc_html__('No rows found', 'wp-frontend-editor') . '</div>';
        }
        
        return ob_get_clean();
    }
    
    /**
     * Render a flexible content field with proper formatting
     * 
     * @since 1.0.1
     * @param string $field_name The field name
     * @param int $post_id The post ID
     * @param array $field_object The ACF field object
     * @return string The HTML output
     */
    private function render_acf_flexible_content($field_name, $post_id, $field_object) {
        ob_start();
        
        if (have_rows($field_name, $post_id)) {
            echo '<div class="acf-flexible-content acf-flexible-' . esc_attr($field_name) . '">';
            
            $layout_count = 0;
            while (have_rows($field_name, $post_id)) { 
                the_row();
                $layout = get_row_layout();
                $layout_count++;
                
                echo '<div class="acf-layout acf-layout-' . esc_attr($layout) . '" data-layout="' . esc_attr($layout) . '" data-index="' . esc_attr($layout_count) . '">';
                
                // Get layout label
                $layout_label = $layout;
                foreach ($field_object['layouts'] as $layout_obj) {
                    if ($layout_obj['name'] === $layout) {
                        $layout_label = $layout_obj['label'];
                        break;
                    }
                }
                echo '<div class="acf-layout-label">' . esc_html($layout_label) . '</div>';
                
                // Get sub fields for this layout
                $layout_fields = array();
                foreach ($field_object['layouts'] as $layout_obj) {
                    if ($layout_obj['name'] === $layout) {
                        $layout_fields = $layout_obj['sub_fields'];
                        break;
                    }
                }
                
                // Output each sub field within the layout
                foreach ($layout_fields as $sub_field) {
                    $sub_value = get_sub_field($sub_field['name']);
                    
                    echo '<div class="acf-field acf-field-' . esc_attr($sub_field['name']) . ' acf-field-type-' . esc_attr($sub_field['type']) . '">';
                    echo '<div class="acf-field-label">' . esc_html($sub_field['label']) . '</div>';
                    
                    echo '<div class="acf-field-value-wrap">';
                    // Use our enhanced render_field_value method
                    echo $this->render_field_value($sub_value, $sub_field);
                    echo '</div>';
                    
                    echo '</div>';
                }
                
                echo '</div>'; // End of layout
            }
            
            if ($layout_count === 0) {
                echo '<div class="acf-empty-flexible">' . esc_html__('No layouts found', 'wp-frontend-editor') . '</div>';
            }
            
            echo '</div>';
        } else {
            echo '<div class="acf-empty-flexible">' . esc_html__('No layouts found', 'wp-frontend-editor') . '</div>';
        }
        
        return ob_get_clean();
    }
    
    /**
     * Render a group field with proper formatting
     * 
     * @since 1.0.1
     * @param string $field_name The field name
     * @param int $post_id The post ID
     * @param array $field_object The ACF field object
     * @param mixed $value The field value (optional)
     * @return string The HTML output
     */
    private function render_acf_group($field_name, $post_id, $field_object, $value = null) {
        ob_start();
        
        echo '<div class="acf-group acf-group-' . esc_attr($field_name) . '">';
        
        // Get group value if not provided
        if ($value === null) {
            $value = get_field($field_name, $post_id);
        }
        
        if (isset($field_object['sub_fields']) && is_array($field_object['sub_fields'])) {
            foreach ($field_object['sub_fields'] as $sub_field) {
                $sub_value = isset($value[$sub_field['name']]) ? $value[$sub_field['name']] : null;
                
                if ($sub_value === null) {
                    // Try alternate methods to get the value
                    $sub_value = get_field($field_name . '_' . $sub_field['name'], $post_id);
                }
                
                echo '<div class="acf-field acf-field-' . esc_attr($sub_field['name']) . ' acf-field-type-' . esc_attr($sub_field['type']) . '">';
                echo '<div class="acf-field-label">' . esc_html($sub_field['label']) . '</div>';
                
                echo '<div class="acf-field-value-wrap">';
                // Use our enhanced render_field_value method
                echo $this->render_field_value($sub_value, $sub_field);
                echo '</div>';
                
                echo '</div>';
            }
        } elseif (is_array($value)) {
            // If we don't have subfield definitions but have a value array, just render each key
            foreach ($value as $key => $sub_value) {
                echo '<div class="acf-field acf-field-' . esc_attr($key) . '">';
                echo '<div class="acf-field-label">' . esc_html(ucfirst(str_replace('_', ' ', $key))) . '</div>';
                
                echo '<div class="acf-field-value-wrap">';
                // Use our enhanced render_field_value method for the subvalue
                echo $this->render_field_value($sub_value, array('type' => is_array($sub_value) ? 'group' : 'text'));
                echo '</div>';
                
                echo '</div>';
            }
        }
        
        echo '</div>';
        
        return ob_get_clean();
    }
    
    /**
     * Get a rendered field.
     * 
     * Used to update complex fields (repeaters, flexible content) without page reload.
     * Handles all ACF field types with appropriate rendering.
     * 
     * @since 1.0.0
     * @updated 1.0.1 Added support for all ACF field types
     * @return void
     */
    public function get_rendered_field() {
        // Check nonce - use wp_die to immediately terminate on failure
        check_ajax_referer( 'wpfe-editor-nonce', 'nonce', true );
        
        // Get parameters
        $post_id = isset( $_GET['post_id'] ) ? intval( $_GET['post_id'] ) : 0;
        $field_name = isset( $_GET['field_name'] ) ? sanitize_text_field( $_GET['field_name'] ) : '';
        
        if ( ! $post_id || ! $field_name ) {
            wp_send_json_error( array(
                'message' => __( 'Invalid parameters', 'wp-frontend-editor' ),
            ) );
        }
        
        // Check if user can edit this post
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            wp_send_json_error( array(
                'message' => __( 'You do not have permission to edit this post', 'wp-frontend-editor' ),
            ) );
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
                
                // Handle different field types using our specialized helper methods
                switch ( $field_object['type'] ) {
                    case 'repeater':
                        echo $this->render_acf_repeater($field_name, $post_id, $field_object);
                        break;
                        
                    case 'flexible_content':
                        echo $this->render_acf_flexible_content($field_name, $post_id, $field_object);
                        break;
                        
                    case 'group':
                        echo $this->render_acf_group($field_name, $post_id, $field_object, $value);
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
                                // Use our enhanced render_field_value method
                                echo $this->render_field_value($sub_value, $sub_field);
                                echo '</div>';
                                
                                echo '</div>';
                            }
                        } else {
                            // For clone fields without explicit subfields, just render the value we have
                            echo $this->render_field_value($value, $field_object);
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
                        // For all other field types, use our enhanced render_field_value method
                        echo $this->render_field_value($value, $field_object);
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
        
        wp_send_json_success( array(
            'html' => $output,
        ) );
    }
}