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
     * 
     * @since 1.0.0
     * @param string $field_name The field name to search for
     * @param int $post_id The post ID to search in
     * @param int $recursion_depth Current recursion depth (to prevent infinite loops)
     * @return array|false The field data array if found, false otherwise
     */
    public function find_acf_field_by_name( $field_name, $post_id, $recursion_depth = 0 ) {
        // Prevent excessive recursion
        if ( $recursion_depth > 10 ) {
            return false;
        }
        
        // Check cache first
        $cache_key = $post_id . '_' . $field_name;
        if ( isset( $this->field_cache[$cache_key] ) ) {
            return $this->field_cache[$cache_key];
        }
        
        // Try direct lookup first (most common case)
        if ( function_exists( 'get_field_object' ) ) {
            $field = get_field_object( $field_name, $post_id );
            if ( $field && isset( $field['name'] ) && $field['name'] === $field_name ) {
                $this->field_cache[$cache_key] = $field;
                return $field;
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
                        if ( $field['name'] === $field_name ) {
                            $this->field_cache[$cache_key] = $field;
                            return $field;
                        }
                        
                        // If not found, check in subfields (for repeaters, flexible content, etc.)
                        $sub_field = $this->find_field_in_subfields( $field, $field_name, $recursion_depth + 1 );
                        if ( $sub_field ) {
                            $this->field_cache[$cache_key] = $sub_field;
                            return $sub_field;
                        }
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
        
        // Check for subfields in different field types
        if ( isset( $field['type'] ) ) {
            // Handle direct match first
            if ( isset( $field['name'] ) && $field['name'] === $field_name ) {
                return $field;
            }
            
            // Check for any field type that might contain subfields
            if ( isset( $field['sub_fields'] ) && is_array( $field['sub_fields'] ) ) {
                // Field types like repeater, group, clone, etc.
                foreach ( $field['sub_fields'] as $sub_field ) {
                    if ( isset( $sub_field['name'] ) && $sub_field['name'] === $field_name ) {
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
                case 'group':
                    // Already handled above, but may need special processing in the future
                    break;
                    
                case 'flexible_content':
                    if ( isset( $field['layouts'] ) && is_array( $field['layouts'] ) ) {
                        foreach ( $field['layouts'] as $layout ) {
                            // Check layout name directly (rare but possible case)
                            if ( isset( $layout['name'] ) && $layout['name'] === $field_name ) {
                                return $layout;
                            }
                            
                            // Check layout sub_fields
                            if ( isset( $layout['sub_fields'] ) && is_array( $layout['sub_fields'] ) ) {
                                foreach ( $layout['sub_fields'] as $sub_field ) {
                                    if ( isset( $sub_field['name'] ) && $sub_field['name'] === $field_name ) {
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
                    
                case 'clone':
                    // Clone fields can have nested sub_fields as well
                    if ( isset( $field['clone'] ) && is_array( $field['clone'] ) ) {
                        // In some cases, the cloned fields are directly accessible
                        foreach ( $field['clone'] as $cloned_field_key ) {
                            // Try to get the actual cloned field
                            if ( function_exists( 'acf_get_field' ) ) {
                                $cloned_field = acf_get_field( $cloned_field_key );
                                if ( $cloned_field ) {
                                    if ( isset( $cloned_field['name'] ) && $cloned_field['name'] === $field_name ) {
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
        
        switch ( $field_data['type'] ) {
            case 'text':
            case 'textarea':
            case 'email':
                return sanitize_text_field( $value );
                
            case 'wysiwyg':
                return wp_kses_post( $value );
                
            case 'number':
                return is_numeric( $value ) ? floatval( $value ) : 0;
                
            case 'date_picker':
            case 'date_time_picker':
            case 'time_picker':
                // Ensure date is in correct format
                if ( ! empty( $value ) && function_exists( 'acf_format_date' ) ) {
                    return acf_format_date( $value, $field_data['return_format'] );
                }
                return $value;
                
            case 'true_false':
                return (bool) $value;
                
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
                
            case 'file':
            case 'image':
                // Handle both ID and array format
                if ( is_array( $value ) && isset( $value['id'] ) ) {
                    return intval( $value['id'] );
                }
                return intval( $value );
                
            case 'gallery':
                if ( is_array( $value ) ) {
                    $clean_ids = array();
                    foreach ( $value as $id ) {
                        if ( is_array( $id ) && isset( $id['id'] ) ) {
                            $clean_ids[] = intval( $id['id'] );
                        } else {
                            $clean_ids[] = intval( $id );
                        }
                    }
                    return $clean_ids;
                }
                return array();
                
            case 'repeater':
            case 'flexible_content':
            case 'group':
                // These complex types are handled by ACF directly
                return $value;
                
            default:
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