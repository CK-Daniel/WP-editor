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
                            return is_array( $param );
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
                    if ( class_exists( 'ACF' ) && function_exists( 'get_field' ) ) {
                        // Check if field exists
                        $acf_field = acf_get_field( $field );
                        
                        if ( $acf_field ) {
                            $field_value = get_field( $field, $post_id, false );
                            
                            // Add field-specific data for special field types
                            $extra_data = array();
                            
                            // Add relationship field data
                            if ($acf_field['type'] === 'relationship' || $acf_field['type'] === 'post_object') {
                                // Get post type(s) from field config
                                $post_types = isset($acf_field['post_type']) ? $acf_field['post_type'] : array('post');
                                if (empty($post_types)) {
                                    $post_types = array('post', 'page');
                                }
                                
                                // Get the available posts
                                $posts = get_posts(array(
                                    'post_type' => $post_types,
                                    'posts_per_page' => 50, // Limit for performance
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
                            }
                            
                            $data[ $field ] = array(
                                'value' => $field_value,
                                'type'  => $acf_field['type'],
                                'label' => $acf_field['label'],
                                'field_config' => $acf_field,
                            );
                            
                            // Merge extra data if available
                            if (!empty($extra_data)) {
                                $data[$field] = array_merge($data[$field], $extra_data);
                            }
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
    
    /**
     * Get image data for a specified attachment.
     * 
     * Used to update featured images without page reload.
     */
    public function get_image_data() {
        // Check nonce
        if ( ! check_ajax_referer( 'wpfe-editor-nonce', 'nonce', false ) ) {
            wp_send_json_error( array(
                'message' => __( 'Security check failed', 'wp-frontend-editor' ),
            ) );
        }
        
        // Get attachment ID
        $attachment_id = isset( $_GET['attachment_id'] ) ? intval( $_GET['attachment_id'] ) : 0;
        
        if ( ! $attachment_id ) {
            wp_send_json_error( array(
                'message' => __( 'Invalid attachment ID', 'wp-frontend-editor' ),
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
     */
    public function get_gallery_data() {
        // Check nonce
        if ( ! check_ajax_referer( 'wpfe-editor-nonce', 'nonce', false ) ) {
            wp_send_json_error( array(
                'message' => __( 'Security check failed', 'wp-frontend-editor' ),
            ) );
        }
        
        // Get attachment IDs
        $attachment_ids = isset( $_GET['attachment_ids'] ) ? $_GET['attachment_ids'] : '';
        
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
            wp_send_json_error( array(
                'message' => __( 'Invalid attachment IDs', 'wp-frontend-editor' ),
            ) );
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
        
        wp_send_json_success( array(
            'images' => $gallery_data,
        ) );
    }
    
    /**
     * Get a rendered field.
     * 
     * Used to update complex fields (repeaters, flexible content) without page reload.
     */
    public function get_rendered_field() {
        // Check nonce
        if ( ! check_ajax_referer( 'wpfe-editor-nonce', 'nonce', false ) ) {
            wp_send_json_error( array(
                'message' => __( 'Security check failed', 'wp-frontend-editor' ),
            ) );
        }
        
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
        
        wp_send_json_success( array(
            'html' => $output,
        ) );
    }
}