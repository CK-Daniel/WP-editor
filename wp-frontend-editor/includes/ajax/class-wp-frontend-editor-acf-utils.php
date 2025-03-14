<?php
/**
 * ACF Utilities class.
 * 
 * Provides utility methods for working with Advanced Custom Fields.
 *
 * @package WPFrontendEditor
 * @since 1.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * ACF Utilities class.
 * 
 * @since 1.0.0
 */
class WP_Frontend_Editor_ACF_Utils {

    /**
     * A cache for ACF field lookups to avoid duplicate queries.
     *
     * @since 1.0.0
     * @var array
     */
    private $field_cache = array();

    /**
     * Constructor.
     *
     * @since 1.0.0
     */
    public function __construct() {
        // Initialize any necessary properties
    }

    /**
     * Find an ACF field by name in a post.
     * 
     * Recursively searches through field groups to find the field by name.
     * Enhanced to handle a wider variety of field name formats and structures.
     * 
     * @since 1.0.0
     * @param string $field_name The field name to search for
     * @param int $post_id The post ID to search in
     * @param int $recursion_depth Current recursion depth (to prevent infinite loops)
     * @return array|false The field data array if found, false otherwise
     */
    public function find_acf_field_by_name( $field_name, $post_id, $recursion_depth = 0 ) {
        // Log for debugging purposes
        error_log('WPFE ACF Utils: Looking for field: ' . $field_name . ' in post: ' . $post_id);
        
        // Prevent excessive recursion
        if ( $recursion_depth > 10 ) {
            error_log('WPFE ACF Utils: Max recursion depth reached for field: ' . $field_name);
            return false;
        }
        
        // Check cache first
        $cache_key = $post_id . '_' . $field_name;
        if ( isset( $this->field_cache[$cache_key] ) ) {
            return $this->field_cache[$cache_key];
        }
        
        // Try field key format detection - ACF fields can be referenced by 'field_xxxxxxxx' key
        $is_field_key = (strpos($field_name, 'field_') === 0);
        
        // Try direct lookup first (most common case)
        if ( function_exists( 'get_field_object' ) ) {
            $field = get_field_object( $field_name, $post_id );
            if ( $field && (
                // Match by name
                (isset( $field['name'] ) && $field['name'] === $field_name) || 
                // Match by key
                (isset( $field['key'] ) && $field['key'] === $field_name) 
            )) {
                $this->field_cache[$cache_key] = $field;
                return $field;
            }
        }
        
        // If field is a field_key format and not found by direct lookup, try ACF's get_field helper
        if ( $is_field_key && function_exists('acf_get_field') ) {
            $direct_field = acf_get_field($field_name);
            if ( $direct_field ) {
                $this->field_cache[$cache_key] = $direct_field;
                return $direct_field;
            }
        }
        
        // Try to normalize field name - sometimes field names contain prefixes or special formats
        $normalized_field_name = $field_name;
        
        // Remove common prefixes that might be present 
        $prefixes_to_try = array('acf_', 'field_', '_');
        foreach ( $prefixes_to_try as $prefix ) {
            if ( strpos( $field_name, $prefix ) === 0 ) {
                $without_prefix = substr($field_name, strlen($prefix));
                
                // Try lookup with prefix removed
                if ( function_exists( 'get_field_object' ) ) {
                    $prefix_field = get_field_object( $without_prefix, $post_id );
                    if ( $prefix_field ) {
                        $this->field_cache[$cache_key] = $prefix_field;
                        return $prefix_field;
                    }
                }
                
                // Also store this normalized version for later checks
                $normalized_field_name = $without_prefix;
            }
        }
        
        // If not found, try to find field in all field groups
        if ( function_exists( 'acf_get_field_groups' ) ) {
            $field_groups = acf_get_field_groups( array( 'post_id' => $post_id ) );
            
            foreach ( $field_groups as $field_group ) {
                if ( function_exists( 'acf_get_fields' ) ) {
                    $fields = acf_get_fields( $field_group );
                    
                    // Check if our field is in the top level
                    foreach ( $fields as $field ) {
                        // More flexible name matching
                        if (
                            // Match by name
                            (isset( $field['name'] ) && ($field['name'] === $field_name || $field['name'] === $normalized_field_name)) ||
                            // Match by key
                            (isset( $field['key'] ) && ($field['key'] === $field_name)) ||
                            // Match by other possible identifiers
                            (isset( $field['id'] ) && ($field['id'] == $field_name))
                        ) {
                            $this->field_cache[$cache_key] = $field;
                            return $field;
                        }
                        
                        // If not found, check in subfields (for repeaters, flexible content, etc.)
                        $sub_field = $this->find_field_in_subfields( $field, $field_name, $recursion_depth + 1 );
                        if ( $sub_field ) {
                            $this->field_cache[$cache_key] = $sub_field;
                            return $sub_field;
                        }
                        
                        // Also try with normalized field name
                        if ($normalized_field_name !== $field_name) {
                            $sub_field = $this->find_field_in_subfields( $field, $normalized_field_name, $recursion_depth + 1 );
                            if ( $sub_field ) {
                                $this->field_cache[$cache_key] = $sub_field;
                                return $sub_field;
                            }
                        }
                    }
                }
            }
        }
        
        // Not found by direct lookup, try metadata
        $meta_key = $field_name;
        
        // For ACF fields, sometimes the meta key is prefixed with underscore
        if (strpos($meta_key, '_') !== 0) {
            $meta_with_underscore = '_' . $meta_key;
            
            // Check if the meta key exists with underscore prefix
            $meta_value = get_post_meta($post_id, $meta_with_underscore, true);
            if ($meta_value && is_string($meta_value) && strpos($meta_value, 'field_') === 0) {
                // This is likely a reference to an ACF field key
                $field_key = $meta_value;
                if (function_exists('acf_get_field')) {
                    $meta_field = acf_get_field($field_key);
                    if ($meta_field) {
                        $this->field_cache[$cache_key] = $meta_field;
                        return $meta_field;
                    }
                }
            }
        }
        
        // Not found
        $this->field_cache[$cache_key] = false;
        return false;
    }

    /**
     * Find a field in subfields recursively.
     * 
     * Enhanced version that supports more complex ACF field structures.
     * This improved version handles all field types including:
     * - Repeaters (including nested)
     * - Flexible content
     * - Groups
     * - Galleries
     * - Clones
     * - And other complex field types
     * 
     * @since 1.0.0
     * @param array $field The parent field
     * @param string $field_name The field name to search for
     * @param int $recursion_depth Current recursion depth
     * @return array|false The field data array if found, false otherwise
     */
    public function find_field_in_subfields( $field, $field_name, $recursion_depth ) {
        // Prevent excessive recursion
        if ( $recursion_depth > 10 ) {
            return false;
        }
        
        // Normalize field name for better matching
        $normalized_field_name = $field_name;
        if (strpos($field_name, 'field_') === 0) {
            $normalized_field_name = substr($field_name, 6);
        } else if (strpos($field_name, '_') === 0) {
            $normalized_field_name = substr($field_name, 1);
        }
        
        // Check for subfields in different field types
        if ( isset( $field['type'] ) ) {
            // Handle direct match first with more robust matching
            if (
                // Match by name
                (isset($field['name']) && ($field['name'] === $field_name || $field['name'] === $normalized_field_name)) || 
                // Match by key
                (isset($field['key']) && ($field['key'] === $field_name)) ||
                // Match by ID
                (isset($field['id']) && ($field['id'] == $field_name)) ||
                // Check field name as structure (some_field:0:sub_field)
                (isset($field['name']) && preg_match('/\b' . preg_quote($field['name'], '/') . '\b/', $field_name))
            ) {
                return $field;
            }
            
            // Check for any field type that might contain subfields
            if ( isset( $field['sub_fields'] ) && is_array( $field['sub_fields'] ) ) {
                // Field types like repeater, group, clone, etc.
                foreach ( $field['sub_fields'] as $sub_field ) {
                    // Try exact match on name
                    if (
                        (isset($sub_field['name']) && ($sub_field['name'] === $field_name || $sub_field['name'] === $normalized_field_name)) || 
                        (isset($sub_field['key']) && ($sub_field['key'] === $field_name))
                    ) {
                        return $sub_field;
                    }
                    
                    // For fields inside repeaters, check for pattern like "repeater_0_subfield"
                    if (isset($sub_field['name']) && isset($field['name']) && 
                        $field['type'] === 'repeater' && 
                        preg_match('/' . preg_quote($field['name'], '/') . '_(\d+)_' . preg_quote($sub_field['name'], '/') . '/', $field_name)
                    ) {
                        return $sub_field;
                    }
                    
                    // Recursively check nested subfields
                    $nested_field = $this->find_field_in_subfields( $sub_field, $field_name, $recursion_depth + 1 );
                    if ( $nested_field ) {
                        return $nested_field;
                    }
                }
            }
            
            // Handle specific field types with different storage structures
            switch ( $field['type'] ) {
                case 'repeater':
                    // Special handling for repeater fields with row indices
                    if (isset($field['name'])) {
                        // Check for pattern like "repeater:0:subfield" or "repeater_0_subfield"
                        $repeater_patterns = array(
                            '/^' . preg_quote($field['name'], '/') . ':(\d+):(.+)$/', // ACF pattern
                            '/^' . preg_quote($field['name'], '/') . '_(\d+)_(.+)$/', // Alternative pattern
                        );
                        
                        foreach ($repeater_patterns as $pattern) {
                            if (preg_match($pattern, $field_name, $matches)) {
                                $row_index = $matches[1];
                                $sub_field_name = $matches[2];
                                
                                // Now check if this sub_field_name exists in the repeater's sub_fields
                                if (isset($field['sub_fields']) && is_array($field['sub_fields'])) {
                                    foreach ($field['sub_fields'] as $sub_field) {
                                        if (isset($sub_field['name']) && $sub_field['name'] === $sub_field_name) {
                                            // Add row index info to the field
                                            $sub_field['row_index'] = $row_index;
                                            $sub_field['parent_repeater'] = $field['name'];
                                            return $sub_field;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    break;
                    
                case 'flexible_content':
                    if ( isset( $field['layouts'] ) && is_array( $field['layouts'] ) ) {
                        foreach ( $field['layouts'] as $layout ) {
                            // Check layout name directly (rare but possible case)
                            if ( isset( $layout['name'] ) && ($layout['name'] === $field_name || $layout['name'] === $normalized_field_name) ) {
                                return $layout;
                            }
                            
                            // Check if field_name follows pattern like "flexible_layout:0:subfield"
                            if (isset($field['name']) && isset($layout['name']) && preg_match('/^' . preg_quote($field['name'], '/') . ':(\d+)/', $field_name)) {
                                // Get layout index and subfield name
                                if (preg_match('/^' . preg_quote($field['name'], '/') . ':(\d+):(.+)$/', $field_name, $matches)) {
                                    $layout_index = $matches[1];
                                    $sub_field_name = $matches[2];
                                    
                                    // Check if subfields contain this name
                                    if (isset($layout['sub_fields']) && is_array($layout['sub_fields'])) {
                                        foreach ($layout['sub_fields'] as $sub_field) {
                                            if (isset($sub_field['name']) && $sub_field['name'] === $sub_field_name) {
                                                // Add layout info to the field
                                                $sub_field['layout_index'] = $layout_index;
                                                $sub_field['layout_name'] = $layout['name'];
                                                $sub_field['parent_flexible'] = $field['name'];
                                                return $sub_field;
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // Check layout sub_fields
                            if ( isset( $layout['sub_fields'] ) && is_array( $layout['sub_fields'] ) ) {
                                foreach ( $layout['sub_fields'] as $sub_field ) {
                                    if ( isset( $sub_field['name'] ) && ($sub_field['name'] === $field_name || $sub_field['name'] === $normalized_field_name) ) {
                                        // Add parent layout info
                                        $sub_field['parent_layout'] = $layout['name'];
                                        return $sub_field;
                                    }
                                    
                                    // Recursively check nested subfields
                                    $nested_field = $this->find_field_in_subfields( $sub_field, $field_name, $recursion_depth + 1 );
                                    if ( $nested_field ) {
                                        return $nested_field;
                                    }
                                }
                            }
                        }
                    }
                    break;
                    
                case 'gallery':
                    // Gallery fields can be referenced directly or by index
                    if (isset($field['name'])) {
                        // Check if field_name follows pattern like "gallery:0" or "gallery_0"
                        $gallery_patterns = array(
                            '/^' . preg_quote($field['name'], '/') . ':(\d+)$/', // ACF pattern
                            '/^' . preg_quote($field['name'], '/') . '_(\d+)$/', // Alternative pattern
                        );
                        
                        foreach ($gallery_patterns as $pattern) {
                            if (preg_match($pattern, $field_name, $matches)) {
                                $image_index = $matches[1];
                                
                                // Return the field with image index info
                                $gallery_field = $field;
                                $gallery_field['image_index'] = $image_index;
                                return $gallery_field;
                            }
                        }
                    }
                    break;
                
                case 'group':
                    // Groups can be referenced directly or with subfield notation
                    if (isset($field['name'])) {
                        // Check for pattern like "group:subfield" or "group_subfield"
                        $group_patterns = array(
                            '/^' . preg_quote($field['name'], '/') . ':(.+)$/', // ACF pattern
                            '/^' . preg_quote($field['name'], '/') . '_(.+)$/', // Alternative pattern
                        );
                        
                        foreach ($group_patterns as $pattern) {
                            if (preg_match($pattern, $field_name, $matches)) {
                                $sub_field_name = $matches[1];
                                
                                // Check if this sub_field_name exists in the group's sub_fields
                                if (isset($field['sub_fields']) && is_array($field['sub_fields'])) {
                                    foreach ($field['sub_fields'] as $sub_field) {
                                        if (isset($sub_field['name']) && $sub_field['name'] === $sub_field_name) {
                                            // Add parent group info
                                            $sub_field['parent_group'] = $field['name'];
                                            return $sub_field;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    break;
                    
                case 'clone':
                    // Clone fields can have nested sub_fields as well
                    if ( isset( $field['clone'] ) && is_array( $field['clone'] ) ) {
                        // In some cases, the cloned fields are directly accessible
                        foreach ( $field['clone'] as $cloned_field_key ) {
                            // Try to get the actual cloned field
                            if ( function_exists( 'acf_get_field' ) ) {
                                $cloned_field = acf_get_field( $cloned_field_key );
                                if ( $cloned_field ) {
                                    if ( isset( $cloned_field['name'] ) && ($cloned_field['name'] === $field_name || $cloned_field['name'] === $normalized_field_name) ) {
                                        // Add parent clone info
                                        $cloned_field['parent_clone'] = $field['name'];
                                        return $cloned_field;
                                    }
                                    
                                    // Handle clone prefix mode
                                    if (isset($field['name']) && isset($cloned_field['name']) && 
                                        isset($field['prefix']) && $field['prefix'] !== 'seamless' &&
                                        preg_match('/^' . preg_quote($field['name'], '/') . '_' . preg_quote($cloned_field['name'], '/') . '$/', $field_name)
                                    ) {
                                        // Add parent clone info
                                        $cloned_field['parent_clone'] = $field['name'];
                                        return $cloned_field;
                                    }
                                    
                                    // Recursively check cloned field
                                    $nested_field = $this->find_field_in_subfields( $cloned_field, $field_name, $recursion_depth + 1 );
                                    if ( $nested_field ) {
                                        return $nested_field;
                                    }
                                }
                            }
                        }
                    }
                    break;
            }
        }
        
        return false;
    }

    /**
     * Process ACF field value for saving.
     * 
     * Handles different field types with appropriate formatting.
     * Enhanced version with better support for all field types.
     * 
     * @since 1.0.0
     * @param mixed $value The field value to process
     * @param array $field_data The field data
     * @return mixed The processed value
     */
    public function process_acf_value_for_saving( $value, $field_data ) {
        if ( ! isset( $field_data['type'] ) ) {
            return $value;
        }
        
        // Handle empty values appropriately by field type
        if ( $value === null || $value === '' ) {
            switch ( $field_data['type'] ) {
                case 'number':
                case 'range':
                    return 0;
                case 'gallery':
                case 'repeater':
                case 'flexible_content':
                    return array();
                case 'true_false':
                    return false;
                default:
                    return '';
            }
        }
        
        switch ( $field_data['type'] ) {
            // Basic text fields
            case 'text':
            case 'textarea':
            case 'email':
            case 'url':
            case 'password':
                return sanitize_text_field( $value );
                
            // Rich text handling
            case 'wysiwyg':
                // Preserve HTML formatting but remove potentially harmful content
                return wp_kses_post( $value );
                
            // Embedded content
            case 'oembed':
                // Just return the URL, let WordPress handle the oembed
                return esc_url_raw( $value );
                
            // Numeric fields
            case 'number':
            case 'range':
                return is_numeric( $value ) ? floatval( $value ) : 0;
                
            // Date/time fields
            case 'date_picker':
            case 'date_time_picker':
            case 'time_picker':
                // Ensure date is in correct format
                if ( ! empty( $value ) && function_exists( 'acf_format_date' ) ) {
                    $format = isset($field_data['return_format']) ? $field_data['return_format'] : 'Y-m-d H:i:s';
                    return acf_format_date( $value, $format );
                }
                return $value;
                
            // Boolean fields
            case 'true_false':
                return (bool) $value;
                
            // Color fields
            case 'color_picker':
                // Validate hex color or return empty
                return preg_match('/^#[a-f0-9]{6}$/i', $value) ? $value : '';
                
            // Choice fields
            case 'select':
            case 'checkbox':
            case 'radio':
            case 'button_group':
                // Handle multiple selections
                if ( is_array( $value ) ) {
                    foreach ( $value as $key => $val ) {
                        $value[$key] = sanitize_text_field( $val );
                    }
                } else {
                    $value = sanitize_text_field( $value );
                }
                return $value;
                
            // File fields
            case 'file':
            case 'image':
                // Handle multiple formats: ID, URL, or array
                if ( is_array( $value ) ) {
                    // Array format with ID
                    if ( isset( $value['id'] ) ) {
                        return intval( $value['id'] );
                    }
                    // Array format with URL only
                    else if ( isset( $value['url'] ) ) {
                        // Try to get attachment ID from URL
                        $attachment_id = attachment_url_to_postid( $value['url'] );
                        if ( $attachment_id ) {
                            return $attachment_id;
                        }
                        // If can't find ID, store as array with URL
                        return array( 'url' => esc_url_raw( $value['url'] ) );
                    }
                } 
                // String that looks like a number - treat as ID
                else if ( is_numeric( $value ) ) {
                    return intval( $value );
                }
                // String that looks like a URL - convert to ID if possible
                else if ( filter_var( $value, FILTER_VALIDATE_URL ) ) {
                    $attachment_id = attachment_url_to_postid( $value );
                    if ( $attachment_id ) {
                        return $attachment_id;
                    }
                    // If can't find ID, store as array with URL
                    return array( 'url' => esc_url_raw( $value ) );
                }
                
                // Default fallback
                return $value;
                
            // Gallery fields - enhanced for robust handling
            case 'gallery':
                if ( is_array( $value ) ) {
                    $clean_ids = array();
                    
                    // First check if we have a special gallery structure
                    if (isset($field_data['image_index']) && isset($value['id'])) {
                        // Single image update within gallery
                        $existing_gallery = get_field($field_data['name'], $field_data['post_id'], false);
                        if (is_array($existing_gallery)) {
                            // Get the existing gallery and update specific image
                            $index = intval($field_data['image_index']);
                            if (isset($existing_gallery[$index])) {
                                $existing_gallery[$index] = intval($value['id']);
                                return $existing_gallery;
                            }
                        }
                        // Fallback - just return the single ID as array
                        return array(intval($value['id']));
                    }
                    
                    // Standard gallery field - process all entries
                    foreach ( $value as $id ) {
                        // Handle various formats galleries might be submitted in
                        if ( is_array( $id ) && isset( $id['id'] ) ) {
                            // Standard ACF format with ID
                            $clean_ids[] = intval( $id['id'] );
                        } else if ( is_array( $id ) && isset( $id['url'] ) ) {
                            // URL format - try to convert to ID
                            $attachment_id = attachment_url_to_postid( $id['url'] );
                            if ( $attachment_id ) {
                                $clean_ids[] = $attachment_id;
                            }
                        } else if ( is_numeric( $id ) ) {
                            // Direct ID
                            $clean_ids[] = intval( $id );
                        } else if ( is_string( $id ) && filter_var( $id, FILTER_VALIDATE_URL ) ) {
                            // URL string - try to convert to ID
                            $attachment_id = attachment_url_to_postid( $id );
                            if ( $attachment_id ) {
                                $clean_ids[] = $attachment_id;
                            }
                        }
                    }
                    return $clean_ids;
                }
                return array();
                
            // Relational fields
            case 'link':
                // Process link field, ensuring all required parts are present
                if ( is_array( $value ) ) {
                    $clean_link = array();
                    if ( isset( $value['url'] ) ) {
                        $clean_link['url'] = esc_url_raw( $value['url'] );
                    }
                    if ( isset( $value['title'] ) ) {
                        $clean_link['title'] = sanitize_text_field( $value['title'] );
                    }
                    if ( isset( $value['target'] ) ) {
                        $clean_link['target'] = sanitize_text_field( $value['target'] );
                    }
                    return $clean_link;
                }
                return array('url' => '', 'title' => '', 'target' => '');
            
            case 'post_object':
            case 'page_link':
            case 'relationship':
                // Handle both single and multiple selection
                if ( is_array( $value ) ) {
                    $clean_ids = array();
                    foreach ( $value as $id ) {
                        if ( is_numeric( $id ) ) {
                            $clean_ids[] = intval( $id );
                        } else if ( is_array( $id ) && isset( $id['ID'] ) ) {
                            $clean_ids[] = intval( $id['ID'] );
                        } else if ( is_object( $id ) && isset( $id->ID ) ) {
                            $clean_ids[] = intval( $id->ID );
                        }
                    }
                    return $clean_ids;
                } else if ( is_numeric( $value ) ) {
                    return intval( $value );
                } else if ( is_array( $value ) && isset( $value['ID'] ) ) {
                    return intval( $value['ID'] );
                } else if ( is_object( $value ) && isset( $value->ID ) ) {
                    return intval( $value->ID );
                }
                return $value;
            
            case 'taxonomy':
                // Handle taxonomy fields (both hierarchical and non-hierarchical)
                if ( is_array( $value ) ) {
                    $clean_terms = array();
                    foreach ( $value as $term ) {
                        if ( is_numeric( $term ) ) {
                            $clean_terms[] = intval( $term );
                        } else if ( is_array( $term ) && isset( $term['term_id'] ) ) {
                            $clean_terms[] = intval( $term['term_id'] );
                        } else if ( is_object( $term ) && isset( $term->term_id ) ) {
                            $clean_terms[] = intval( $term->term_id );
                        } else if ( is_string( $term ) ) {
                            // Could be a term name for non-hierarchical taxonomies
                            $clean_terms[] = sanitize_text_field( $term );
                        }
                    }
                    return $clean_terms;
                } else if ( is_string( $value ) ) {
                    // Single term name for non-hierarchical taxonomies
                    return sanitize_text_field( $value );
                } else if ( is_numeric( $value ) ) {
                    // Single term ID
                    return intval( $value );
                }
                return $value;
                
            case 'user':
                // Handle user fields
                if ( is_array( $value ) ) {
                    $clean_users = array();
                    foreach ( $value as $user ) {
                        if ( is_numeric( $user ) ) {
                            $clean_users[] = intval( $user );
                        } else if ( is_array( $user ) && isset( $user['ID'] ) ) {
                            $clean_users[] = intval( $user['ID'] );
                        } else if ( is_object( $user ) && isset( $user->ID ) ) {
                            $clean_users[] = intval( $user->ID );
                        }
                    }
                    return $clean_users;
                } else if ( is_numeric( $value ) ) {
                    return intval( $value );
                } else if ( is_array( $value ) && isset( $value['ID'] ) ) {
                    return intval( $value['ID'] );
                } else if ( is_object( $value ) && isset( $value->ID ) ) {
                    return intval( $value->ID );
                }
                return $value;
                
            // Google map field
            case 'google_map':
                if ( is_array( $value ) ) {
                    $clean_map = array();
                    if ( isset( $value['address'] ) ) {
                        $clean_map['address'] = sanitize_text_field( $value['address'] );
                    }
                    if ( isset( $value['lat'] ) && is_numeric( $value['lat'] ) ) {
                        $clean_map['lat'] = floatval( $value['lat'] );
                    }
                    if ( isset( $value['lng'] ) && is_numeric( $value['lng'] ) ) {
                        $clean_map['lng'] = floatval( $value['lng'] );
                    }
                    return $clean_map;
                }
                return $value;
                
            // Complex fields
            case 'repeater':
            case 'flexible_content':
            case 'group':
            case 'clone':
                // These complex types are handled by ACF directly
                
                // For repeaters and flexible content, ensure we have valid array structure
                if ($field_data['type'] === 'repeater' || $field_data['type'] === 'flexible_content') {
                    if (!is_array($value)) {
                        return array();
                    }
                }
                
                // For flexible content, ensure 'acf_fc_layout' key exists in each layout
                if ($field_data['type'] === 'flexible_content' && is_array($value)) {
                    foreach ($value as $i => $layout) {
                        if (is_array($layout) && !isset($layout['acf_fc_layout']) && isset($field_data['layout_name'])) {
                            // Add layout name from field data if missing
                            $value[$i]['acf_fc_layout'] = $field_data['layout_name'];
                        }
                    }
                }
                
                return $value;
                
            // Layout fields - generally don't need value processing
            case 'message':
            case 'tab':
            case 'accordion':
                return '';
                
            // Default fallback
            default:
                // Unknown field type, return as is
                return $value;
        }
    }

    /**
     * Detect if a field is an ACF field.
     *
     * @since 1.0.0
     * @param string $field_name The field name
     * @param int $post_id The post ID
     * @return bool Whether the field is an ACF field
     */
    public function is_acf_field( $field_name, $post_id ) {
        if ( ! function_exists( 'get_field_object' ) ) {
            return false;
        }
        
        $field_object = get_field_object( $field_name, $post_id );
        return ( $field_object && isset( $field_object['key'] ) );
    }

    /**
     * Get an ACF field value with proper formatting.
     *
     * @since 1.0.0
     * @param string $field_name The field name
     * @param int $post_id The post ID
     * @return mixed The field value
     */
    public function get_formatted_acf_value( $field_name, $post_id ) {
        if ( ! function_exists( 'get_field' ) ) {
            return null;
        }
        
        // Get field value
        $value = get_field( $field_name, $post_id, false ); // false = don't format value
        
        // Return raw value
        return $value;
    }
    
    /**
     * Clear the field cache.
     * 
     * @since 1.0.0
     * @return void
     */
    public function clear_cache() {
        $this->field_cache = array();
    }
}