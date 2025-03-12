<?php
/**
 * Form handler class.
 * 
 * Handles form submission and validation.
 *
 * @package WPFrontendEditor
 * @since 1.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Form handler class.
 * 
 * @since 1.0.0
 */
class WP_Frontend_Editor_Form_Handler {

    /**
     * ACF Utils instance.
     *
     * @since 1.0.0
     * @var WP_Frontend_Editor_ACF_Utils
     */
    private $acf_utils;

    /**
     * Constructor.
     *
     * @since 1.0.0
     * @param WP_Frontend_Editor_ACF_Utils $acf_utils ACF Utils instance.
     */
    public function __construct( $acf_utils ) {
        $this->acf_utils = $acf_utils;
    }

    /**
     * Validate a field value before saving.
     *
     * @since 1.0.0
     * @param mixed $value The field value to validate
     * @param string $field_name The field name
     * @param array $field_data The field data (optional)
     * @return mixed|WP_Error The validated value or WP_Error on failure
     */
    public function validate_field_value( $value, $field_name, $field_data = null ) {
        // ACF field validation
        if ( $field_data && isset( $field_data['type'] ) ) {
            switch ( $field_data['type'] ) {
                case 'email':
                    if ( ! empty( $value ) && ! is_email( $value ) ) {
                        return new WP_Error( 'invalid_email', __( 'Invalid email address', 'wp-frontend-editor' ) );
                    }
                    break;
                    
                case 'url':
                    if ( ! empty( $value ) && ! wp_http_validate_url( $value ) ) {
                        return new WP_Error( 'invalid_url', __( 'Invalid URL', 'wp-frontend-editor' ) );
                    }
                    break;
                    
                case 'number':
                    if ( ! empty( $value ) && ! is_numeric( $value ) ) {
                        return new WP_Error( 'invalid_number', __( 'Value must be a number', 'wp-frontend-editor' ) );
                    }
                    
                    // Check min/max values if set
                    if ( isset( $field_data['min'] ) && $value < $field_data['min'] ) {
                        return new WP_Error( 
                            'number_too_small', 
                            sprintf( __( 'Value must be at least %s', 'wp-frontend-editor' ), $field_data['min'] ) 
                        );
                    }
                    
                    if ( isset( $field_data['max'] ) && $value > $field_data['max'] ) {
                        return new WP_Error( 
                            'number_too_large', 
                            sprintf( __( 'Value cannot exceed %s', 'wp-frontend-editor' ), $field_data['max'] ) 
                        );
                    }
                    break;
                    
                case 'image':
                case 'file':
                    if ( ! empty( $value ) ) {
                        if ( is_numeric( $value ) ) {
                            if ( ! wp_get_attachment_url( $value ) ) {
                                return new WP_Error( 'invalid_attachment', __( 'Invalid attachment ID', 'wp-frontend-editor' ) );
                            }
                        } else if ( is_array( $value ) && isset( $value['id'] ) ) {
                            if ( ! wp_get_attachment_url( $value['id'] ) ) {
                                return new WP_Error( 'invalid_attachment', __( 'Invalid attachment ID', 'wp-frontend-editor' ) );
                            }
                        }
                    }
                    break;
                    
                case 'gallery':
                    if ( ! empty( $value ) && is_array( $value ) ) {
                        foreach ( $value as $index => $attachment_id ) {
                            $id = is_array( $attachment_id ) && isset( $attachment_id['id'] ) ? $attachment_id['id'] : $attachment_id;
                            if ( ! wp_get_attachment_url( $id ) ) {
                                return new WP_Error( 
                                    'invalid_gallery_item', 
                                    sprintf( __( 'Invalid attachment ID at position %d', 'wp-frontend-editor' ), $index + 1 ) 
                                );
                            }
                        }
                    }
                    break;
                    
                case 'select':
                case 'checkbox':
                case 'radio':
                case 'button_group':
                    // Check if value is in allowed choices
                    if ( isset( $field_data['choices'] ) && ! empty( $value ) ) {
                        if ( is_array( $value ) ) {
                            foreach ( $value as $selected ) {
                                if ( ! isset( $field_data['choices'][$selected] ) ) {
                                    return new WP_Error( 
                                        'invalid_choice', 
                                        sprintf( __( 'Invalid choice: %s', 'wp-frontend-editor' ), sanitize_text_field( $selected ) ) 
                                    );
                                }
                            }
                        } else {
                            if ( ! isset( $field_data['choices'][$value] ) ) {
                                return new WP_Error( 
                                    'invalid_choice', 
                                    sprintf( __( 'Invalid choice: %s', 'wp-frontend-editor' ), sanitize_text_field( $value ) ) 
                                );
                            }
                        }
                    }
                    break;
                    
                case 'date_picker':
                case 'date_time_picker':
                case 'time_picker':
                    if ( ! empty( $value ) ) {
                        $timestamp = strtotime( $value );
                        if ( ! $timestamp ) {
                            return new WP_Error( 'invalid_date', __( 'Invalid date format', 'wp-frontend-editor' ) );
                        }
                    }
                    break;
            }
        }
        
        // For WordPress core fields
        else {
            switch ( $field_name ) {
                case 'post_title':
                    if ( empty( $value ) ) {
                        return new WP_Error( 'empty_title', __( 'Title cannot be empty', 'wp-frontend-editor' ) );
                    }
                    break;
                    
                case 'post_content':
                    // No specific validation for post_content
                    break;
                    
                case 'post_excerpt':
                    // No specific validation for post_excerpt
                    break;
            }
        }
        
        return $value;
    }

    /**
     * Sanitize a field value based on its type.
     *
     * @since 1.0.0
     * @param mixed $value The field value to sanitize
     * @param string $field_name The field name
     * @param array $field_data The field data (optional)
     * @return mixed The sanitized value
     */
    public function sanitize_field_value( $value, $field_name, $field_data = null ) {
        // ACF field sanitization
        if ( $field_data && isset( $field_data['type'] ) ) {
            return $this->acf_utils->process_acf_value_for_saving( $value, $field_data );
        }
        
        // WordPress core fields
        else {
            switch ( $field_name ) {
                case 'post_title':
                    return sanitize_text_field( $value );
                    
                case 'post_content':
                    return wp_kses_post( $value );
                    
                case 'post_excerpt':
                    return sanitize_textarea_field( $value );
                    
                default:
                    // Generic sanitization for unknown fields
                    if ( is_array( $value ) ) {
                        array_walk_recursive( $value, function( &$item ) {
                            if ( is_string( $item ) ) {
                                $item = sanitize_text_field( $item );
                            } else if ( is_numeric( $item ) ) {
                                $item = floatval( $item );
                            } else if ( is_bool( $item ) ) {
                                $item = (bool) $item;
                            }
                        });
                        return $value;
                    } else if ( is_string( $value ) ) {
                        return sanitize_text_field( $value );
                    }
                    return $value;
            }
        }
    }

    /**
     * Verify a nonce for form submissions.
     *
     * @since 1.0.0
     * @param string $nonce The nonce value
     * @param string $action The nonce action
     * @return bool Whether the nonce is valid
     */
    public function verify_nonce( $nonce, $action ) {
        return wp_verify_nonce( $nonce, $action );
    }

    /**
     * Check if user has permissions to edit a post.
     *
     * @since 1.0.0
     * @param int $post_id The post ID
     * @return bool Whether the user can edit the post
     */
    public function can_edit_post( $post_id ) {
        return current_user_can( 'edit_post', $post_id );
    }

    /**
     * Process form submission.
     *
     * @since 1.0.0
     * @param array $data The form data
     * @param int $post_id The post ID
     * @return array|WP_Error Result array on success, WP_Error on failure
     */
    public function process_form_submission( $data, $post_id ) {
        // Verify nonce
        if ( ! isset( $data['nonce'] ) || ! $this->verify_nonce( $data['nonce'], 'wpfe-editor-nonce' ) ) {
            return new WP_Error( 'invalid_nonce', __( 'Security verification failed', 'wp-frontend-editor' ) );
        }
        
        // Check permissions
        if ( ! $this->can_edit_post( $post_id ) ) {
            return new WP_Error( 'permission_denied', __( 'You do not have permission to edit this post', 'wp-frontend-editor' ) );
        }
        
        // Initialize result
        $result = array(
            'message' => __( 'Form submitted successfully', 'wp-frontend-editor' ),
            'fields' => array(),
            'errors' => array(),
        );
        
        // Process fields
        if ( isset( $data['fields'] ) && is_array( $data['fields'] ) ) {
            foreach ( $data['fields'] as $field_name => $field_value ) {
                // Get field data if it's an ACF field
                $field_data = null;
                if ( function_exists( 'get_field_object' ) ) {
                    $field_data = get_field_object( $field_name, $post_id );
                }
                
                // Validate field
                $validated_value = $this->validate_field_value( $field_value, $field_name, $field_data );
                if ( is_wp_error( $validated_value ) ) {
                    $result['errors'][$field_name] = $validated_value->get_error_message();
                    continue;
                }
                
                // Sanitize field
                $sanitized_value = $this->sanitize_field_value( $validated_value, $field_name, $field_data );
                
                // Update field
                if ( $field_data ) {
                    // ACF field
                    update_field( $field_name, $sanitized_value, $post_id );
                } else {
                    // WordPress core field or custom field
                    if ( in_array( $field_name, array( 'post_title', 'post_content', 'post_excerpt' ) ) ) {
                        // Update post
                        wp_update_post( array(
                            'ID' => $post_id,
                            $field_name => $sanitized_value,
                        ) );
                    } else {
                        // Update custom field
                        update_post_meta( $post_id, $field_name, $sanitized_value );
                    }
                }
                
                $result['fields'][$field_name] = $sanitized_value;
            }
        }
        
        // Return error if there were validation issues
        if ( ! empty( $result['errors'] ) ) {
            return new WP_Error( 
                'validation_failed', 
                __( 'Some fields failed validation', 'wp-frontend-editor' ),
                $result['errors']
            );
        }
        
        return $result;
    }
}