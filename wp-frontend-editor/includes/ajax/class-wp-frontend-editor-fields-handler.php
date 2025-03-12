<?php
/**
 * Fields handler class.
 * 
 * Handles field data retrieval and saving.
 *
 * @package WPFrontendEditor
 * @since 1.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Fields handler class.
 * 
 * @since 1.0.0
 */
class WP_Frontend_Editor_Fields_Handler {

    /**
     * ACF utilities instance.
     *
     * @since 1.0.0
     * @var WP_Frontend_Editor_ACF_Utils
     */
    private $acf_utils;
    
    /**
     * Constructor.
     *
     * @since 1.0.0
     * @param WP_Frontend_Editor_ACF_Utils $acf_utils ACF utilities instance.
     */
    public function __construct( $acf_utils = null ) {
        // If ACF utils is not provided, create a new instance
        $this->acf_utils = $acf_utils ?: new WP_Frontend_Editor_ACF_Utils();
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
    public function get_field_data( $post_id, $fields ) {
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
                        $data = $this->get_acf_field_data($data, $field, $post_id);
                    }
                    break;
            }
        }

        return $data;
    }

    /**
     * Get ACF field data.
     *
     * @param array  $data    The current data array.
     * @param string $field   The field name.
     * @param int    $post_id The post ID.
     * @return array The updated data array.
     */
    private function get_acf_field_data($data, $field, $post_id) {
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
                    $posts_per_page = apply_filters('wpfe_relationship_posts_per_page', $posts_per_page, $field, $acf_field);
                    
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
        
        return $data;
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
    public function save_field_data( $post_id, $fields ) {
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
                        $acf_result = $this->save_acf_field_data($field_name, $value, $post_id);
                        if ( is_wp_error( $acf_result ) ) {
                            $errors[] = $acf_result->get_error_message();
                        } elseif ( $acf_result ) {
                            $updated_fields[$field_name] = $value;
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
     * Save ACF field data.
     *
     * @param string $field_name The field name or key.
     * @param mixed  $value      The field value.
     * @param int    $post_id    The post ID.
     * @return bool|WP_Error True on success, WP_Error on failure.
     */
    private function save_acf_field_data($field_name, $value, $post_id) {
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
                return new WP_Error(
                    'wpfe_unsupported_field_type',
                    sprintf(
                        /* translators: %1$s: field name, %2$s: field type */
                        __( 'Field type "%2$s" is not supported: %1$s', 'wp-frontend-editor' ),
                        $acf_field['label'],
                        $acf_field['type']
                    )
                );
            }
            
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
                                return new WP_Error(
                                    'wpfe_clone_update_error',
                                    sprintf(
                                        /* translators: %s: field name */
                                        __( 'Failed to update cloned subfield: %s', 'wp-frontend-editor' ),
                                        $sub_field['label']
                                    )
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
            
            if (!$update_success) {
                return new WP_Error(
                    'wpfe_field_update_error',
                    sprintf(
                        /* translators: %s: field name */
                        __( 'Failed to update ACF field: %s', 'wp-frontend-editor' ),
                        $acf_field['label']
                    )
                );
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Find an ACF field by name
     *
     * @param string $field_name The field name to find
     * @return array|false The ACF field array or false if not found
     */
    public function find_acf_field_by_name($field_name) {
        return $this->acf_utils->find_acf_field_by_name($field_name, null);
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
    public function find_field_in_subfields($field, $field_name, $depth = 0, $max_depth = 3) {
        return $this->acf_utils->find_field_in_subfields($field, $field_name, $depth);
    }
    
    /**
     * Process ACF field value for saving based on field type
     *
     * @param array $field The ACF field configuration
     * @param mixed $value The value to process
     * @return mixed The processed value
     */
    public function process_acf_value_for_saving($field, $value) {
        return $this->acf_utils->process_acf_value_for_saving($field, $value);
    }
}