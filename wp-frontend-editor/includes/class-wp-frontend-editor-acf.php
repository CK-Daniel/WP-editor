<?php
/**
 * The ACF integration class.
 *
 * @package WPFrontendEditor
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * ACF integration class.
 */
class WP_Frontend_Editor_ACF {

    /**
     * ACF field types that are currently supported.
     * 
     * @var array
     */
    private $supported_field_types = array(
        // Basic fields
        'text',
        'textarea',
        'number',
        'range',
        'email',
        'url',
        'password',
        'wysiwyg',
        'oembed',
        'image',
        'file',
        'gallery',
        'select',
        'checkbox',
        'radio',
        'button_group',
        'true_false',
        'date_picker',
        'date_time_picker',
        'time_picker',
        'color_picker',
        
        // Advanced fields
        'repeater',
        'flexible_content',
        'group',
        'clone',
        
        // Relational fields
        'link',
        'taxonomy',
        'relationship',
        'post_object',
        'page_link',
        'user',
        
        // jQuery fields
        'google_map',
        
        // Layout fields
        'message',
        'tab',
        'accordion',
    );

    /**
     * Constructor.
     */
    public function __construct() {
        // Only proceed if ACF is active
        if ( ! class_exists( 'ACF' ) ) {
            return;
        }

        // Add ACF field edit buttons
        add_action( 'wp_footer', array( $this, 'add_acf_edit_buttons' ) );
        
        // Add filter to generate edit buttons for ACF fields
        add_filter( 'wpfe_get_edit_button', array( $this, 'get_acf_edit_button' ), 10, 3 );
        
        // Add option to auto-enable all ACF fields
        add_filter( 'acf/update_field_group', array( $this, 'auto_enable_acf_fields' ), 10, 1 );
        
        // Register ACF fields for editing
        add_action( 'init', array( $this, 'register_acf_fields' ), 20 );
    }

    /**
     * Register all ACF fields as editable.
     */
    public function register_acf_fields() {
        if ( ! class_exists( 'ACF' ) ) {
            return;
        }
        
        // Get current options
        $options = get_option( 'wpfe_options', array() );
        
        // Get all field groups
        $field_groups = acf_get_field_groups();
        
        if ( empty( $field_groups ) ) {
            return;
        }
        
        // Initialize acf_fields array if not exists
        if ( ! isset( $options['acf_fields'] ) ) {
            $options['acf_fields'] = array();
        }
        
        $new_fields_added = false;
        
        // Loop through all field groups and fields
        foreach ( $field_groups as $field_group ) {
            $fields = acf_get_fields( $field_group );
            
            if ( empty( $fields ) ) {
                continue;
            }
            
            foreach ( $fields as $field ) {
                // Check if field is already enabled
                if ( ! in_array( $field['key'], $options['acf_fields'], true ) && in_array( $field['type'], $this->supported_field_types, true ) ) {
                    // Add the field key to enabled fields
                    $options['acf_fields'][] = $field['key'];
                    $new_fields_added = true;
                }
                
                // For repeater and flexible content fields, also enable sub-fields
                if ( in_array( $field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) ) {
                    $this->add_sub_fields_recursively( $field, $options['acf_fields'], $new_fields_added );
                }
            }
        }
        
        // Update options if new fields were added
        if ( $new_fields_added ) {
            update_option( 'wpfe_options', $options );
        }
    }
    
    /**
     * Recursively add sub-fields of complex field types.
     *
     * @param array $field The parent field.
     * @param array $enabled_fields The array of enabled field keys (passed by reference).
     * @param bool  $new_fields_added Whether new fields were added (passed by reference).
     */
    private function add_sub_fields_recursively( $field, &$enabled_fields, &$new_fields_added ) {
        if ( 'repeater' === $field['type'] && isset( $field['sub_fields'] ) ) {
            foreach ( $field['sub_fields'] as $sub_field ) {
                if ( ! in_array( $sub_field['key'], $enabled_fields, true ) && in_array( $sub_field['type'], $this->supported_field_types, true ) ) {
                    $enabled_fields[] = $sub_field['key'];
                    $new_fields_added = true;
                }
                
                // Recursive for nested repeaters or groups
                if ( in_array( $sub_field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) ) {
                    $this->add_sub_fields_recursively( $sub_field, $enabled_fields, $new_fields_added );
                }
            }
        } elseif ( 'flexible_content' === $field['type'] && isset( $field['layouts'] ) ) {
            foreach ( $field['layouts'] as $layout ) {
                if ( isset( $layout['sub_fields'] ) ) {
                    foreach ( $layout['sub_fields'] as $sub_field ) {
                        if ( ! in_array( $sub_field['key'], $enabled_fields, true ) && in_array( $sub_field['type'], $this->supported_field_types, true ) ) {
                            $enabled_fields[] = $sub_field['key'];
                            $new_fields_added = true;
                        }
                        
                        // Recursive for nested repeaters or groups
                        if ( in_array( $sub_field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) ) {
                            $this->add_sub_fields_recursively( $sub_field, $enabled_fields, $new_fields_added );
                        }
                    }
                }
            }
        } elseif ( 'group' === $field['type'] && isset( $field['sub_fields'] ) ) {
            foreach ( $field['sub_fields'] as $sub_field ) {
                if ( ! in_array( $sub_field['key'], $enabled_fields, true ) && in_array( $sub_field['type'], $this->supported_field_types, true ) ) {
                    $enabled_fields[] = $sub_field['key'];
                    $new_fields_added = true;
                }
                
                // Recursive for nested repeaters or groups
                if ( in_array( $sub_field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) ) {
                    $this->add_sub_fields_recursively( $sub_field, $enabled_fields, $new_fields_added );
                }
            }
        }
    }
    
    /**
     * Auto-enable new ACF fields when they are created or updated.
     *
     * @param array $field_group The field group being saved.
     * @return array The field group.
     */
    public function auto_enable_acf_fields( $field_group ) {
        // Process after a short delay to ensure field is saved
        add_action( 'acf/save_post', function() {
            $this->register_acf_fields();
        }, 20 );
        
        return $field_group;
    }
  
    /**
     * Add edit buttons to ACF fields.
     */
    public function add_acf_edit_buttons() {
        // Only for logged-in users with edit capabilities
        if ( ! is_user_logged_in() || ! current_user_can( 'edit_posts' ) ) {
            return;
        }

        // Get current post
        $post_id = get_the_ID();
        
        if ( ! $post_id || ! current_user_can( 'edit_post', $post_id ) ) {
            return;
        }

        // Get enabled ACF fields from settings
        $options = get_option( 'wpfe_options', array() );
        $enabled_fields = isset( $options['acf_fields'] ) ? $options['acf_fields'] : array();
        
        // If auto-enable is on, get all fields
        if ( isset( $options['auto_enable_acf'] ) && $options['auto_enable_acf'] ) {
            $enabled_fields = $this->get_all_acf_field_keys();
        }
        
        if ( empty( $enabled_fields ) ) {
            return;
        }

        // Get all field groups for this post
        $field_groups = acf_get_field_groups( array(
            'post_id' => $post_id,
        ) );

        if ( empty( $field_groups ) ) {
            return;
        }

        // Output inline script to initialize ACF field buttons
        ?>
        <script type="text/javascript">
        (function($) {
            $(document).ready(function() {
                var acfFields = <?php echo wp_json_encode( $this->get_acf_field_selectors( $field_groups, $enabled_fields, $post_id ) ); ?>;
                
                // Initialize ACF field edit buttons
                if (typeof wpfe !== 'undefined' && wpfe.initAcfFields) {
                    wpfe.initAcfFields(acfFields);
                } else {
                    // If wpfe is not ready yet, wait and try again
                    setTimeout(function() {
                        if (typeof wpfe !== 'undefined' && wpfe.initAcfFields) {
                            wpfe.initAcfFields(acfFields);
                        }
                    }, 1000);
                }
            });
        })(jQuery);
        </script>
        <?php
    }

    /**
     * Get all ACF field keys in the system.
     *
     * @return array Array of all ACF field keys.
     */
    private function get_all_acf_field_keys() {
        $all_field_keys = array();
        $field_groups = acf_get_field_groups();
        
        if ( empty( $field_groups ) ) {
            return $all_field_keys;
        }
        
        foreach ( $field_groups as $field_group ) {
            $fields = acf_get_fields( $field_group );
            
            if ( empty( $fields ) ) {
                continue;
            }
            
            foreach ( $fields as $field ) {
                if ( in_array( $field['type'], $this->supported_field_types, true ) ) {
                    $all_field_keys[] = $field['key'];
                }
                
                // Get sub-fields for complex field types
                if ( in_array( $field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) ) {
                    $sub_field_keys = $this->get_sub_field_keys_recursively( $field );
                    $all_field_keys = array_merge( $all_field_keys, $sub_field_keys );
                }
            }
        }
        
        return $all_field_keys;
    }
    
    /**
     * Recursively get sub-field keys from complex field types.
     *
     * @param array $field The field to process.
     * @return array Array of sub-field keys.
     */
    private function get_sub_field_keys_recursively( $field ) {
        $sub_field_keys = array();
        
        if ( 'repeater' === $field['type'] && isset( $field['sub_fields'] ) ) {
            foreach ( $field['sub_fields'] as $sub_field ) {
                if ( in_array( $sub_field['type'], $this->supported_field_types, true ) ) {
                    $sub_field_keys[] = $sub_field['key'];
                }
                
                if ( in_array( $sub_field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) ) {
                    $nested_keys = $this->get_sub_field_keys_recursively( $sub_field );
                    $sub_field_keys = array_merge( $sub_field_keys, $nested_keys );
                }
            }
        } elseif ( 'flexible_content' === $field['type'] && isset( $field['layouts'] ) ) {
            foreach ( $field['layouts'] as $layout ) {
                if ( isset( $layout['sub_fields'] ) ) {
                    foreach ( $layout['sub_fields'] as $sub_field ) {
                        if ( in_array( $sub_field['type'], $this->supported_field_types, true ) ) {
                            $sub_field_keys[] = $sub_field['key'];
                        }
                        
                        if ( in_array( $sub_field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) ) {
                            $nested_keys = $this->get_sub_field_keys_recursively( $sub_field );
                            $sub_field_keys = array_merge( $sub_field_keys, $nested_keys );
                        }
                    }
                }
            }
        } elseif ( 'group' === $field['type'] && isset( $field['sub_fields'] ) ) {
            foreach ( $field['sub_fields'] as $sub_field ) {
                if ( in_array( $sub_field['type'], $this->supported_field_types, true ) ) {
                    $sub_field_keys[] = $sub_field['key'];
                }
                
                if ( in_array( $sub_field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) ) {
                    $nested_keys = $this->get_sub_field_keys_recursively( $sub_field );
                    $sub_field_keys = array_merge( $sub_field_keys, $nested_keys );
                }
            }
        }
        
        return $sub_field_keys;
    }

    /**
     * Get ACF field selectors by field key.
     *
     * @param array $field_groups The ACF field groups.
     * @param array $enabled_fields The enabled ACF field keys.
     * @param int   $post_id The post ID.
     * @return array The field selectors.
     */
    private function get_acf_field_selectors( $field_groups, $enabled_fields, $post_id ) {
        $field_selectors = array();

        foreach ( $field_groups as $field_group ) {
            $fields = acf_get_fields( $field_group );
            
            if ( empty( $fields ) ) {
                continue;
            }

            foreach ( $fields as $field ) {
                // Skip if not enabled
                if ( ! in_array( $field['key'], $enabled_fields, true ) ) {
                    continue;
                }

                // Get field value and selector
                $field_value = get_field( $field['key'], $post_id, false );
                $field_selector = $this->get_acf_field_selector( $field, $field_value );

                if ( $field_selector ) {
                    $field_selectors[] = array(
                        'key'      => $field['key'],
                        'name'     => $field['name'],
                        'label'    => $field['label'],
                        'type'     => $field['type'],
                        'selector' => $field_selector,
                        'post_id'  => $post_id,
                    );
                }
                
                // For complex fields (repeater, flexible content, group), handle sub-fields
                if ( in_array( $field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) ) {
                    $sub_field_selectors = $this->get_sub_field_selectors( $field, $field_value, $enabled_fields, $post_id );
                    $field_selectors = array_merge( $field_selectors, $sub_field_selectors );
                }
            }
        }

        return $field_selectors;
    }

    /**
     * Get selectors for sub-fields of complex field types.
     *
     * @param array $field The parent field.
     * @param mixed $value The field value.
     * @param array $enabled_fields The enabled ACF field keys.
     * @param int   $post_id The post ID.
     * @return array Array of sub-field selectors.
     */
    private function get_sub_field_selectors( $field, $value, $enabled_fields, $post_id ) {
        $sub_field_selectors = array();
        
        if ( 'repeater' === $field['type'] && isset( $field['sub_fields'] ) && is_array( $value ) ) {
            foreach ( $field['sub_fields'] as $sub_field ) {
                if ( ! in_array( $sub_field['key'], $enabled_fields, true ) ) {
                    continue;
                }
                
                // For each row in the repeater
                if ( !empty( $value ) ) {
                    foreach ( $value as $row_index => $row ) {
                        $sub_value = isset( $row[ $sub_field['name'] ] ) ? $row[ $sub_field['name'] ] : '';
                        $sub_selector = $this->get_acf_sub_field_selector( $field, $sub_field, $row_index );
                        
                        if ( $sub_selector ) {
                            $sub_field_selectors[] = array(
                                'key'      => $sub_field['key'],
                                'name'     => $sub_field['name'],
                                'label'    => $sub_field['label'],
                                'type'     => $sub_field['type'],
                                'selector' => $sub_selector,
                                'post_id'  => $post_id,
                                'parent'   => $field['key'],
                                'row_index' => $row_index,
                            );
                        }
                        
                        // Recursive for nested repeaters
                        if ( in_array( $sub_field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) && isset( $row[ $sub_field['name'] ] ) ) {
                            $nested_selectors = $this->get_sub_field_selectors( $sub_field, $row[ $sub_field['name'] ], $enabled_fields, $post_id );
                            $sub_field_selectors = array_merge( $sub_field_selectors, $nested_selectors );
                        }
                    }
                }
            }
        } elseif ( 'flexible_content' === $field['type'] && isset( $field['layouts'] ) && is_array( $value ) ) {
            foreach ( $value as $layout_index => $layout_data ) {
                $layout_name = isset( $layout_data['acf_fc_layout'] ) ? $layout_data['acf_fc_layout'] : '';
                
                // Find the layout
                foreach ( $field['layouts'] as $layout ) {
                    if ( $layout['name'] !== $layout_name ) {
                        continue;
                    }
                    
                    if ( isset( $layout['sub_fields'] ) ) {
                        foreach ( $layout['sub_fields'] as $sub_field ) {
                            if ( ! in_array( $sub_field['key'], $enabled_fields, true ) ) {
                                continue;
                            }
                            
                            $sub_value = isset( $layout_data[ $sub_field['name'] ] ) ? $layout_data[ $sub_field['name'] ] : '';
                            $sub_selector = $this->get_acf_flexible_field_selector( $field, $layout, $sub_field, $layout_index );
                            
                            if ( $sub_selector ) {
                                $sub_field_selectors[] = array(
                                    'key'      => $sub_field['key'],
                                    'name'     => $sub_field['name'],
                                    'label'    => $sub_field['label'],
                                    'type'     => $sub_field['type'],
                                    'selector' => $sub_selector,
                                    'post_id'  => $post_id,
                                    'parent'   => $field['key'],
                                    'layout'   => $layout_name,
                                    'layout_index' => $layout_index,
                                );
                            }
                            
                            // Recursive for nested complex fields
                            if ( in_array( $sub_field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) && isset( $layout_data[ $sub_field['name'] ] ) ) {
                                $nested_selectors = $this->get_sub_field_selectors( $sub_field, $layout_data[ $sub_field['name'] ], $enabled_fields, $post_id );
                                $sub_field_selectors = array_merge( $sub_field_selectors, $nested_selectors );
                            }
                        }
                    }
                }
            }
        } elseif ( 'group' === $field['type'] && isset( $field['sub_fields'] ) && is_array( $value ) ) {
            foreach ( $field['sub_fields'] as $sub_field ) {
                if ( ! in_array( $sub_field['key'], $enabled_fields, true ) ) {
                    continue;
                }
                
                $sub_value = isset( $value[ $sub_field['name'] ] ) ? $value[ $sub_field['name'] ] : '';
                $sub_selector = $this->get_acf_group_field_selector( $field, $sub_field );
                
                if ( $sub_selector ) {
                    $sub_field_selectors[] = array(
                        'key'      => $sub_field['key'],
                        'name'     => $sub_field['name'],
                        'label'    => $sub_field['label'],
                        'type'     => $sub_field['type'],
                        'selector' => $sub_selector,
                        'post_id'  => $post_id,
                        'parent'   => $field['key'],
                    );
                }
                
                // Recursive for nested complex fields
                if ( in_array( $sub_field['type'], array( 'repeater', 'flexible_content', 'group' ), true ) && isset( $value[ $sub_field['name'] ] ) ) {
                    $nested_selectors = $this->get_sub_field_selectors( $sub_field, $value[ $sub_field['name'] ], $enabled_fields, $post_id );
                    $sub_field_selectors = array_merge( $sub_field_selectors, $nested_selectors );
                }
            }
        }
        
        return $sub_field_selectors;
    }

    /**
     * Get the CSS selector for an ACF field.
     *
     * @param array $field The field configuration.
     * @param mixed $value The field value.
     * @return string|false The CSS selector or false if not found.
     */
    private function get_acf_field_selector( $field, $value ) {
        // Skip fields without a name or key
        if ( empty( $field['name'] ) || empty( $field['key'] ) ) {
            return false;
        }
        
        // Prepare the field name in various formats for better selector matching
        $name = trim($field['name']);
        if ( empty($name) ) {
            return false;
        }
        
        $name_dashed = str_replace('_', '-', $name);
        $name_without_prefix = preg_replace('/^(acf|field)_/', '', $name);
        $name_without_prefix_dashed = str_replace('_', '-', $name_without_prefix);
        
        // Create array to store selectors by priority/reliability
        $primary_selectors = array(); // Most reliable selectors
        $secondary_selectors = array(); // Common pattern selectors
        $tertiary_selectors = array(); // Fallback/generic selectors
        
        // PRIMARY SELECTORS (data attributes - highly reliable)
        $primary_selectors = array(
            // Data attribute selectors (most reliable)
            '[data-field-key="' . $field['key'] . '"]',
            '[data-key="' . $field['key'] . '"]',
            '[data-acf-field-key="' . $field['key'] . '"]',
            '[data-field-name="' . $name . '"]',
            '[data-name="' . $name . '"]',
            '[data-acf-field="' . $name . '"]',
            '[data-field="' . $name . '"]',
            '[data-acf="' . $name . '"]',
            
            // Direct ID matches (very reliable)
            '#' . $field['key'],
            '#field_' . $name,
            '#acf-field-' . $name,
            '#acf-' . $name
        );
        
        // SECONDARY SELECTORS (class-based - common in themes)
        $secondary_selectors = array(
            '.acf-field-' . $name,
            '.acf-field-' . $name_dashed,
            '.field-' . $name,
            '.field-' . $name_dashed,
            '.acf-' . $name,
            '.acf-' . $name_dashed,
            '.' . $name . '-field',
            '.' . $name . '-wrapper',
            '.' . $name_dashed . '-field',
            '.' . $name_dashed . '-wrapper'
        );
        
        // Add non-prefix variations if they're different from the name
        if ( $name !== $name_without_prefix && !empty($name_without_prefix) ) {
            $secondary_selectors = array_merge($secondary_selectors, array(
                '.acf-field-' . $name_without_prefix,
                '.acf-field-' . $name_without_prefix_dashed,
                '.field-' . $name_without_prefix,
                '.field-' . $name_without_prefix_dashed,
                '.' . $name_without_prefix . '-field',
                '.' . $name_without_prefix . '-wrapper'
            ));
        }
        
        // TERTIARY SELECTORS (field type-specific and generic)
        $tertiary_selectors = array(
            // Generic class matches
            '.' . $name,
            '.' . $name_dashed,
            '#' . $name,
            '#' . $name_dashed,
            '#field-' . $name,
            '#field-' . $name_dashed,
            '#' . $name . '-field',
            '#' . $name . '-wrapper'
        );
        
        // Field type-specific selectors
        if (isset($field['type'])) {
            switch ($field['type']) {
                case 'text':
                case 'textarea':
                case 'wysiwyg':
                    // Check for common text containers
                    $tertiary_selectors = array_merge($tertiary_selectors, array(
                        '.acf-text-value[data-name="' . $name . '"]',
                        '.acf-content[data-name="' . $name . '"]',
                        'div[class*="' . $name . '"]',
                        'p[class*="' . $name . '"]',
                        'span[class*="' . $name . '"]',
                        'h1[class*="' . $name . '"]',
                        'h2[class*="' . $name . '"]',
                        'h3[class*="' . $name . '"]',
                        'h4[class*="' . $name . '"]',
                        // Add context-based attribute selectors
                        '[data-content-field="' . $name . '"]',
                        '[data-text-field="' . $name . '"]'
                    ));
                    break;
                    
                case 'image':
                    // Image-specific selectors
                    $image_selectors = array(
                        'img[class*="' . $name . '"]',
                        '.acf-image-' . $name,
                        '.img-' . $name,
                        '[data-image-field="' . $name . '"]',
                        '.wp-block-image[class*="' . $name . '"]',
                        '.image-wrapper[class*="' . $name . '"]',
                        'figure[class*="' . $name . '"]'
                    );
                    
                    // Add ID-based selectors for specific image if we have a value
                    if ($value) {
                        $image_id = is_array($value) ? ($value['ID'] ?? $value) : $value;
                        if (is_numeric($image_id) && $image_id > 0) {
                            array_unshift($image_selectors, '.wp-image-' . $image_id); // Add as high priority
                            
                            // Add data attribute for image ID
                            $primary_selectors[] = '[data-image-id="' . $image_id . '"]';
                            
                            // Try to match by file name in src attribute
                            $image_url = wp_get_attachment_url($image_id);
                            if ($image_url && basename($image_url)) {
                                $image_selectors[] = 'img[src*="' . basename($image_url) . '"]';
                            }
                        }
                    }
                    
                    $tertiary_selectors = array_merge($tertiary_selectors, $image_selectors);
                    break;
                    
                case 'gallery':
                    $tertiary_selectors = array_merge($tertiary_selectors, array(
                        '.acf-gallery-' . $name,
                        '.gallery-' . $name,
                        '.wp-block-gallery[class*="' . $name . '"]',
                        '[data-gallery-field="' . $name . '"]',
                        'div[class*="gallery"][class*="' . $name . '"]',
                        '.wp-block-gallery[class*="' . $name . '"]'
                    ));
                    break;
                    
                case 'link':
                    $tertiary_selectors = array_merge($tertiary_selectors, array(
                        'a[class*="' . $name . '"]',
                        '.link-' . $name,
                        '.acf-link-' . $name,
                        // Add attributes that might contain link data
                        '[data-link-field="' . $name . '"]',
                        'a[href][data-field="' . $name . '"]'
                    ));
                    break;
                    
                case 'select':
                case 'checkbox':
                case 'radio':
                    $tertiary_selectors = array_merge($tertiary_selectors, array(
                        '.acf-value-' . $name,
                        '.acf-choice-' . $name,
                        '.choice-' . $name,
                        // Add attributes for option/checkbox values
                        '[data-option-field="' . $name . '"]',
                        '[data-choice-field="' . $name . '"]',
                        '.wp-block-acf-' . $name
                    ));
                    break;
                    
                case 'repeater':
                case 'flexible_content':
                    $tertiary_selectors = array_merge($tertiary_selectors, array(
                        '.acf-repeater-' . $name,
                        '.acf-flexible-' . $name,
                        '.repeater-' . $name,
                        '.flexible-' . $name,
                        '.acf-blocks[data-name="' . $name . '"]',
                        '.acf-rows[data-name="' . $name . '"]',
                        // Add specific data attributes
                        '[data-repeater-field="' . $name . '"]',
                        '[data-flexible-field="' . $name . '"]',
                        // Gutenberg block support
                        '.wp-block-acf-' . $name
                    ));
                    break;
            }
        }
        
        // Add content-based selectors for any field with a value
        if (is_string($value) && !empty($value)) {
            // For text fields with specific content
            $content_excerpt = substr($value, 0, 50); // First 50 chars
            if (strlen($content_excerpt) > 20) { // Only if enough content to be unique
                $content_excerpt = esc_js($content_excerpt);
                $primary_selectors[] = 'div:contains("' . $content_excerpt . '")';
                $primary_selectors[] = 'p:contains("' . $content_excerpt . '")';
                $primary_selectors[] = 'span:contains("' . $content_excerpt . '")';
            }
        }
        
        // Add selectors based on field label (convert to lowercase and dasherize)
        if (isset($field['label']) && !empty($field['label'])) {
            $label_selector = sanitize_title($field['label']);
            if (!empty($label_selector)) {
                $tertiary_selectors = array_merge($tertiary_selectors, array(
                    '.' . $label_selector,
                    '.acf-' . $label_selector,
                    '.field-' . $label_selector,
                    '[data-label="' . esc_attr($field['label']) . '"]'
                ));
            }
        }
        
        // Merge all selectors with priority order
        $all_selectors = array_merge($primary_selectors, $secondary_selectors, $tertiary_selectors);
        
        // Add context-based wrapper selectors - useful for finding fields in specific regions
        $contextual_selectors = array(
            // Look for containers that might wrap field values
            '.entry-content .' . $name,
            '.post-content .' . $name,
            'article .' . $name,
            '.content-area .' . $name,
            '.main-content .' . $name,
            
            // Add theme-specific wrappers for the field
            '#main .' . $name,
            '#content .' . $name,
            '.site-content .' . $name
        );
        
        $all_selectors = array_merge($all_selectors, $contextual_selectors);
        
        // Remove any empty selectors
        $all_selectors = array_filter($all_selectors, function($selector) {
            return !empty($selector) && strlen(trim($selector)) > 1;
        });
        
        // Remove duplicates
        $all_selectors = array_unique($all_selectors);
        
        // Skip if no valid selectors
        if (empty($all_selectors)) {
            return false;
        }
        
        // Store the field key as a special data attribute we'll add to any identified elements
        // This will help with future identification
        $this->enhance_identified_elements($field['key'], $name);
        
        return implode(', ', $all_selectors);
    }
    
    /**
     * Add enhancement script to mark identified elements with data attributes
     * This helps with future identification by adding reliable markers
     *
     * @param string $field_key The field key
     * @param string $field_name The field name
     */
    private function enhance_identified_elements($field_key, $field_name) {
        static $enhancement_added = false;
        
        // Only add the enhancement script once per page
        if (!$enhancement_added) {
            add_action('wp_footer', function() {
                ?>
                <script type="text/javascript">
                (function($) {
                    // After elements are identified and buttons added
                    $(document).on('wpfe:elements_initialized', function() {
                        // Add data attributes to all identified elements for more reliable future selection
                        $('.wpfe-editable').each(function() {
                            var $element = $(this);
                            var fieldKey = $element.data('wpfe-field');
                            
                            if (fieldKey) {
                                // Add multiple identification attributes
                                $element.attr('data-wpfe-identified', 'true');
                                $element.attr('data-field-key', fieldKey);
                                
                                // Add a specific class for this field to make future identification easier
                                $element.addClass('wpfe-field-' + fieldKey);
                            }
                        });
                    });
                    
                    // Trigger after initialization
                    $(document).ready(function() {
                        setTimeout(function() {
                            $(document).trigger('wpfe:elements_initialized');
                        }, 1000);
                    });
                })(jQuery);
                </script>
                <?php
            }, 999); // Late priority to ensure it runs after other scripts
            
            $enhancement_added = true;
        }
    }

    /**
     * Get the CSS selector for an ACF repeater sub-field.
     *
     * @param array $field The parent field.
     * @param array $sub_field The sub-field.
     * @param int   $row_index The row index.
     * @return string|false The CSS selector or false if not found.
     */
    private function get_acf_sub_field_selector( $field, $sub_field, $row_index ) {
        // Prepare field names in various formats
        $field_name = $field['name'];
        $field_name_dashed = str_replace('_', '-', $field_name);
        $sub_field_name = $sub_field['name'];
        $sub_field_name_dashed = str_replace('_', '-', $sub_field_name);
        
        // Support for a variety of theme/plugin implementations
        $selectors = array(
            // Standard ACF markup patterns
            '.acf-field-' . $field_name . ' .acf-row:nth-child(' . ($row_index + 1) . ') .acf-field-' . $sub_field_name,
            '.acf-field-' . $field_name_dashed . ' .acf-row:nth-child(' . ($row_index + 1) . ') .acf-field-' . $sub_field_name_dashed,
            
            // Data attribute patterns (more reliable)
            '[data-acf-field="' . $field_name . '"] [data-row="' . $row_index . '"] [data-acf-field="' . $sub_field_name . '"]',
            '[data-acf-field="' . $field_name . '"] [data-row-index="' . $row_index . '"] [data-acf-field="' . $sub_field_name . '"]',
            '[data-name="' . $field_name . '"] [data-row="' . $row_index . '"] [data-name="' . $sub_field_name . '"]',
            '[data-field="' . $field_name . '"] [data-row="' . $row_index . '"] [data-field="' . $sub_field_name . '"]',
            
            // Theme-specific pattern where the row index is part of a class
            '.acf-field-' . $field_name . ' .acf-row-' . $row_index . ' .acf-field-' . $sub_field_name,
            '.acf-repeater-' . $field_name . ' .acf-row-' . $row_index . ' .field-' . $sub_field_name,
            
            // Theme-specific pattern with the row index in a data attribute
            '.acf-field-' . $field_name . ' [data-id="row-' . $row_index . '"] .acf-field-' . $sub_field_name,
            '.acf-field-' . $field_name . ' [data-index="' . $row_index . '"] .acf-field-' . $sub_field_name,
            
            // Composite selectors (field-row-subfield pattern)
            '[data-acf-field="' . $field_name . '-' . $row_index . '-' . $sub_field_name . '"]',
            '.acf-' . $field_name . '-' . $row_index . '-' . $sub_field_name,
            '.acf-row-' . $row_index . '-' . $sub_field_name,
            
            // Common div structure with numerical indexes
            '.repeater-' . $field_name . ' > div:nth-child(' . ($row_index + 1) . ') .' . $sub_field_name,
            '.' . $field_name . ' > div:nth-child(' . ($row_index + 1) . ') .' . $sub_field_name,
            
            // Block-based themes pattern
            '.wp-block-acf-' . $field_name . ' .acf-row:nth-child(' . ($row_index + 1) . ') .acf-field-' . $sub_field_name,
            
            // Support for themes using ul/li for repeater rows
            '.acf-field-' . $field_name . ' li:nth-child(' . ($row_index + 1) . ') .acf-field-' . $sub_field_name,
            '.acf-list-' . $field_name . ' li:nth-child(' . ($row_index + 1) . ') .' . $sub_field_name,
        );
        
        // Use zero-based and one-based indexing for theme compatibility
        $selectors[] = '.acf-field-' . $field_name . ' .item-' . $row_index . ' .acf-field-' . $sub_field_name;
        $selectors[] = '.acf-field-' . $field_name . ' .item-' . ($row_index + 1) . ' .acf-field-' . $sub_field_name;
        
        // Common array/json notation in ids/classes (field[0][subfield])
        $selectors[] = '[id*="' . $field_name . '\\[' . $row_index . '\\]\\[' . $sub_field_name . '\\]"]';
        $selectors[] = '[class*="' . $field_name . '-' . $row_index . '-' . $sub_field_name . '"]';
        
        return implode(', ', $selectors);
    }

    /**
     * Get the CSS selector for an ACF flexible content sub-field.
     *
     * @param array $field The parent field.
     * @param array $layout The layout.
     * @param array $sub_field The sub-field.
     * @param int   $layout_index The layout index.
     * @return string|false The CSS selector or false if not found.
     */
    private function get_acf_flexible_field_selector( $field, $layout, $sub_field, $layout_index ) {
        // Prepare field names in various formats
        $field_name = $field['name'];
        $field_name_dashed = str_replace('_', '-', $field_name);
        $layout_name = $layout['name'];
        $layout_name_dashed = str_replace('_', '-', $layout_name);
        $sub_field_name = $sub_field['name'];
        $sub_field_name_dashed = str_replace('_', '-', $sub_field_name);
        
        // Support for a variety of theme/plugin implementations
        $selectors = array(
            // Standard ACF markup patterns
            '.acf-field-' . $field_name . ' .layout:nth-child(' . ($layout_index + 1) . ') .acf-field-' . $sub_field_name,
            '.acf-field-' . $field_name_dashed . ' .layout:nth-child(' . ($layout_index + 1) . ') .acf-field-' . $sub_field_name_dashed,
            
            // Data attribute patterns (more reliable)
            '[data-acf-field="' . $field_name . '"] [data-layout="' . $layout_name . '"][data-index="' . $layout_index . '"] [data-acf-field="' . $sub_field_name . '"]',
            '[data-name="' . $field_name . '"] [data-layout="' . $layout_name . '"][data-index="' . $layout_index . '"] [data-name="' . $sub_field_name . '"]',
            '[data-acf-flexible-layout="' . $layout_name . '"][data-index="' . $layout_index . '"] [data-acf-field="' . $sub_field_name . '"]',
            
            // Common theme patterns
            '.acf-flexible-content [data-layout="' . $layout_name . '"][data-index="' . $layout_index . '"] .acf-field-' . $sub_field_name,
            '.acf-flexible-' . $field_name . ' .layout-' . $layout_name . '-' . $layout_index . ' .field-' . $sub_field_name,
            
            // Layout class based selectors
            '.acf-layout-' . $layout_name . ':nth-child(' . ($layout_index + 1) . ') .acf-field-' . $sub_field_name,
            '.layout-' . $layout_name . ':nth-child(' . ($layout_index + 1) . ') .' . $sub_field_name,
            
            // Block-based themes pattern (newer formats)
            '.wp-block-acf-' . $field_name . ' .layout-' . $layout_name . ':nth-child(' . ($layout_index + 1) . ') .' . $sub_field_name,
            '.wp-block-acf-' . $field_name . ' .fc-layout[data-layout="' . $layout_name . '"]:nth-child(' . ($layout_index + 1) . ') .' . $sub_field_name,
            
            // Section/div based patterns (common in themes)
            '.acf-flex-' . $field_name . ' > div:nth-child(' . ($layout_index + 1) . ') .' . $sub_field_name,
            '.section-' . $layout_name . ':nth-child(' . ($layout_index + 1) . ') .' . $sub_field_name,
            
            // Composite class pattern
            '.' . $field_name . '-' . $layout_name . '-' . $layout_index . '-' . $sub_field_name,
            
            // By index only (for themes that don't use layout names in classes)
            '.' . $field_name . ' .layout:nth-child(' . ($layout_index + 1) . ') .' . $sub_field_name,
            '.' . $field_name . ' > div:nth-child(' . ($layout_index + 1) . ') .' . $sub_field_name,
            
            // Support for themes that use a unique id pattern
            '[id*="' . $field_name . '-' . $layout_name . '-' . $layout_index . '"] .' . $sub_field_name,
            
            // One-based index (common in some themes)
            '.' . $field_name . '-layout-' . ($layout_index + 1) . ' .' . $sub_field_name,
            
            // Layout label based (some themes use a sanitized layout label instead of name)
            '.layout-' . sanitize_title($layout['label']) . ':nth-child(' . ($layout_index + 1) . ') .' . $sub_field_name
        );
        
        // Add layout key based selectors (some themes use keys)
        if (isset($layout['key'])) {
            $selectors[] = '[data-key="' . $layout['key'] . '"][data-index="' . $layout_index . '"] [data-name="' . $sub_field_name . '"]';
            $selectors[] = '.acf-layout-' . $layout['key'] . ':nth-child(' . ($layout_index + 1) . ') .' . $sub_field_name;
        }
        
        return implode(', ', $selectors);
    }

    /**
     * Get the CSS selector for an ACF group sub-field.
     *
     * @param array $field The parent field.
     * @param array $sub_field The sub-field.
     * @return string|false The CSS selector or false if not found.
     */
    private function get_acf_group_field_selector( $field, $sub_field ) {
        // Prepare field names in various formats
        $field_name = $field['name'];
        $field_name_dashed = str_replace('_', '-', $field_name);
        $sub_field_name = $sub_field['name'];
        $sub_field_name_dashed = str_replace('_', '-', $sub_field_name);
        
        // Support for a variety of theme/plugin implementations
        $selectors = array(
            // Standard ACF markup patterns
            '.acf-field-' . $field_name . ' .acf-field-' . $sub_field_name,
            '.acf-field-' . $field_name_dashed . ' .acf-field-' . $sub_field_name_dashed,
            
            // Data attribute patterns (more reliable)
            '[data-acf-field="' . $field_name . '"] [data-acf-field="' . $sub_field_name . '"]',
            '[data-acf-group="' . $field_name . '"] [data-acf-field="' . $sub_field_name . '"]',
            '[data-name="' . $field_name . '"] [data-name="' . $sub_field_name . '"]',
            '[data-field="' . $field_name . '"] [data-field="' . $sub_field_name . '"]',
            
            // Group-specific class patterns
            '.acf-group-' . $field_name . ' .' . $sub_field_name,
            '.acf-group-' . $field_name . ' .acf-field-' . $sub_field_name,
            '.acf-group [data-acf-field="' . $field_name . '"] .acf-field-' . $sub_field_name,
            
            // Common div nesting structures
            '.' . $field_name . ' .' . $sub_field_name,
            '.' . $field_name . '-group .' . $sub_field_name,
            '.' . $field_name . '-fields .' . $sub_field_name,
            '.group-' . $field_name . ' .' . $sub_field_name,
            
            // JSON/array notation in classes/ids
            '[class*="' . $field_name . '__' . $sub_field_name . '"]', 
            '[id*="' . $field_name . '-' . $sub_field_name . '"]',
            '[id*="' . $field_name . '_' . $sub_field_name . '"]',
            
            // Block-based themes pattern
            '.wp-block-acf-' . $field_name . ' .' . $sub_field_name,
            '.wp-block-group .' . $field_name . ' .' . $sub_field_name,
            
            // Direct descendant (more precise)
            '.' . $field_name . ' > .' . $sub_field_name,
            '.group-' . $field_name . ' > .' . $sub_field_name,
            
            // Full qualified path for themes that use long class chains
            '.acf-fields .acf-field-' . $field_name . ' .acf-fields .acf-field-' . $sub_field_name
        );
        
        // Add composite class (parent-child)
        $selectors[] = '.' . $field_name . '-' . $sub_field_name;
        $selectors[] = '.acf-' . $field_name . '-' . $sub_field_name;
        
        // Add field label patterns (some themes use labels)
        if (isset($field['label']) && isset($sub_field['label'])) {
            $field_label = sanitize_title($field['label']);
            $sub_field_label = sanitize_title($sub_field['label']);
            
            $selectors[] = '.' . $field_label . ' .' . $sub_field_label;
            $selectors[] = '.group-' . $field_label . ' .' . $sub_field_label;
        }
        
        return implode(', ', $selectors);
    }

    /**
     * Get ACF edit button HTML.
     *
     * @param string $button The existing button HTML.
     * @param string $field_key The field key.
     * @param int    $post_id The post ID.
     * @return string The edit button HTML.
     */
    public function get_acf_edit_button( $button, $field_key, $post_id ) {
        // Only handle ACF fields
        if ( ! class_exists( 'ACF' ) || 0 !== strpos( $field_key, 'field_' ) ) {
            return $button;
        }

        // Get field object
        $field = acf_get_field( $field_key );
        
        if ( ! $field ) {
            return $button;
        }

        // Get button position and style from options
        $options = get_option( 'wpfe_options', array() );
        $button_position = isset( $options['button_position'] ) ? $options['button_position'] : 'top-right';
        $button_style = isset( $options['button_style'] ) ? $options['button_style'] : 'icon-only';
        
        // Position class
        $position_class = 'wpfe-button-' . $button_position;
        
        // Button content based on style
        $button_content = '';
        if ( 'icon-only' === $button_style ) {
            $button_content = '<span class="dashicons dashicons-edit"></span>';
        } elseif ( 'text-only' === $button_style ) {
            $button_content = '<span class="wpfe-button-text">' . esc_html__( 'Edit', 'wp-frontend-editor' ) . '</span>';
        } else { // icon-text
            $button_content = '<span class="dashicons dashicons-edit"></span><span class="wpfe-button-text">' . esc_html__( 'Edit', 'wp-frontend-editor' ) . '</span>';
        }

        // Generate edit button
        return '<button class="wpfe-edit-button ' . esc_attr( $position_class ) . '" data-wpfe-field="' . esc_attr( $field_key ) . '" data-wpfe-post-id="' . esc_attr( $post_id ) . '" data-wpfe-field-type="acf">
            ' . $button_content . '
            <span class="screen-reader-text">' . esc_html__( 'Edit', 'wp-frontend-editor' ) . ' ' . esc_html( $field['label'] ) . '</span>
        </button>';
    }

    /**
     * Get HTML for an ACF field input.
     *
     * @param array $field The field configuration.
     * @param mixed $value The field value.
     * @return string The input HTML.
     */
    public function get_field_input_html( $field, $value ) {
        $html = '';
        
        switch ( $field['type'] ) {
            case 'text':
            case 'email':
            case 'url':
            case 'number':
            case 'range':
            case 'password':
            case 'oembed':
                $html = $this->get_text_input_html( $field, $value );
                break;
                
            case 'textarea':
                $html = $this->get_textarea_html( $field, $value );
                break;
                
            case 'wysiwyg':
                $html = $this->get_wysiwyg_html( $field, $value );
                break;
                
            case 'image':
            case 'file':
                $html = $this->get_media_html( $field, $value );
                break;
                
            case 'gallery':
                $html = $this->get_gallery_html( $field, $value );
                break;
                
            case 'select':
            case 'post_object':
            case 'page_link':
            case 'relationship':
            case 'taxonomy':
            case 'user':
                $html = $this->get_select_html( $field, $value );
                break;
                
            case 'checkbox':
                $html = $this->get_checkbox_html( $field, $value );
                break;
                
            case 'radio':
            case 'button_group':
                $html = $this->get_radio_html( $field, $value );
                break;
                
            case 'true_false':
                $html = $this->get_true_false_html( $field, $value );
                break;
                
            case 'date_picker':
            case 'date_time_picker':
            case 'time_picker':
                $html = $this->get_date_picker_html( $field, $value );
                break;
                
            case 'color_picker':
                $html = $this->get_color_picker_html( $field, $value );
                break;
                
            case 'link':
                $html = $this->get_link_html( $field, $value );
                break;
                
            case 'google_map':
                $html = $this->get_google_map_html( $field, $value );
                break;
                
            case 'repeater':
                $html = $this->get_repeater_html( $field, $value );
                break;
                
            case 'flexible_content':
                $html = $this->get_flexible_content_html( $field, $value );
                break;
                
            case 'group':
                $html = $this->get_group_html( $field, $value );
                break;
                
            default:
                // For unsupported field types, just show a message
                $html = '<p>' . sprintf(
                    /* translators: %s: field type */
                    __( 'Editing %s fields is not supported yet.', 'wp-frontend-editor' ),
                    '<strong>' . esc_html( $field['type'] ) . '</strong>'
                ) . '</p>';
                break;
        }
        
        return $html;
    }

    /**
     * Get HTML for a text input field.
     *
     * @param array  $field The field configuration.
     * @param string $value The field value.
     * @return string The input HTML.
     */
    private function get_text_input_html( $field, $value ) {
        $type = isset( $field['type'] ) ? $field['type'] : 'text';
        
        if ( 'number' === $type || 'range' === $type ) {
            $min = isset( $field['min'] ) ? ' min="' . esc_attr( $field['min'] ) . '"' : '';
            $max = isset( $field['max'] ) ? ' max="' . esc_attr( $field['max'] ) . '"' : '';
            $step = isset( $field['step'] ) ? ' step="' . esc_attr( $field['step'] ) . '"' : '';
        } else {
            $min = $max = $step = '';
        }
        
        $placeholder = isset( $field['placeholder'] ) ? ' placeholder="' . esc_attr( $field['placeholder'] ) . '"' : '';
        
        return '<input type="' . esc_attr( $type ) . '" id="wpfe-field-' . esc_attr( $field['key'] ) . '" 
            name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
            value="' . esc_attr( $value ) . '"
            class="wpfe-input wpfe-text-input"' . $placeholder . $min . $max . $step . '>';
    }

    /**
     * Get HTML for a textarea field.
     *
     * @param array  $field The field configuration.
     * @param string $value The field value.
     * @return string The textarea HTML.
     */
    private function get_textarea_html( $field, $value ) {
        $placeholder = isset( $field['placeholder'] ) ? ' placeholder="' . esc_attr( $field['placeholder'] ) . '"' : '';
        $rows = isset( $field['rows'] ) ? ' rows="' . esc_attr( $field['rows'] ) . '"' : ' rows="4"';
        
        return '<textarea id="wpfe-field-' . esc_attr( $field['key'] ) . '" 
            name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
            class="wpfe-input wpfe-textarea"' . $placeholder . $rows . '>' . esc_textarea( $value ) . '</textarea>';
    }

    /**
     * Get HTML for a WYSIWYG field.
     *
     * @param array  $field The field configuration.
     * @param string $value The field value.
     * @return string The WYSIWYG HTML.
     */
    private function get_wysiwyg_html( $field, $value ) {
        return '<div class="wpfe-wysiwyg-wrapper">
            <textarea id="wpfe-field-' . esc_attr( $field['key'] ) . '" 
                name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
                class="wpfe-input wpfe-wysiwyg"
                data-wysiwyg="1">' . esc_textarea( $value ) . '</textarea>
        </div>';
    }

    /**
     * Get HTML for a media field (image or file).
     *
     * @param array $field The field configuration.
     * @param int   $value The attachment ID.
     * @return string The media field HTML.
     */
    private function get_media_html( $field, $value ) {
        $type = 'image' === $field['type'] ? 'image' : 'file';
        $preview_html = '';
        
        if ( $value ) {
            if ( is_array( $value ) ) {
                $value = isset( $value['id'] ) ? $value['id'] : '';
            }
            
            if ( 'image' === $type && $value ) {
                $image_url = wp_get_attachment_image_url( $value, 'thumbnail' );
                $preview_html = '<div class="wpfe-image-preview">
                    <img src="' . esc_url( $image_url ) . '" alt="">
                </div>';
            } elseif ( $value ) {
                $file_url = wp_get_attachment_url( $value );
                $filename = basename( $file_url );
                $preview_html = '<div class="wpfe-file-preview">
                    <span class="dashicons dashicons-media-default"></span>
                    <span class="wpfe-filename">' . esc_html( $filename ) . '</span>
                </div>';
            }
        }
        
        return '<div class="wpfe-media-field" data-media-type="' . esc_attr( $type ) . '">
            <input type="hidden" id="wpfe-field-' . esc_attr( $field['key'] ) . '" 
                name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
                value="' . esc_attr( $value ) . '"
                class="wpfe-input wpfe-media-input">
            
            <div class="wpfe-media-preview">' . $preview_html . '</div>
            
            <div class="wpfe-media-buttons">
                <button type="button" class="button wpfe-media-upload" data-media-type="' . esc_attr( $type ) . '">
                    ' . esc_html__( 'Select', 'wp-frontend-editor' ) . '
                </button>
                <button type="button" class="button wpfe-media-remove" ' . ( ! $value ? 'style="display:none;"' : '' ) . '>
                    ' . esc_html__( 'Remove', 'wp-frontend-editor' ) . '
                </button>
            </div>
        </div>';
    }

    /**
     * Get HTML for a gallery field.
     *
     * @param array $field The field configuration.
     * @param array $value The gallery attachment IDs.
     * @return string The gallery field HTML.
     */
    private function get_gallery_html( $field, $value ) {
        $gallery_preview = '<div class="wpfe-gallery-preview">';
        
        if ( !empty( $value ) && is_array( $value ) ) {
            // If gallery is stored as array of arrays with id keys
            if ( isset( $value[0] ) && is_array( $value[0] ) && isset( $value[0]['id'] ) ) {
                $image_ids = array_map( function( $item ) {
                    return $item['id'];
                }, $value );
            } else {
                $image_ids = $value;
            }
            
            foreach ( $image_ids as $image_id ) {
                $image_url = wp_get_attachment_image_url( $image_id, 'thumbnail' );
                if ( $image_url ) {
                    $gallery_preview .= '<div class="wpfe-gallery-item" data-id="' . esc_attr( $image_id ) . '">
                        <img src="' . esc_url( $image_url ) . '" alt="">
                        <button type="button" class="wpfe-gallery-remove dashicons dashicons-no-alt"></button>
                    </div>';
                }
            }
        }
        
        $gallery_preview .= '</div>';
        
        $value_json = is_array( $value ) ? esc_attr( json_encode( $value ) ) : '';
        
        return '<div class="wpfe-gallery-field">
            <input type="hidden" id="wpfe-field-' . esc_attr( $field['key'] ) . '" 
                name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
                value=\'' . $value_json . '\'
                class="wpfe-input wpfe-gallery-input">
            
            ' . $gallery_preview . '
            
            <div class="wpfe-gallery-buttons">
                <button type="button" class="button wpfe-gallery-add">
                    ' . esc_html__( 'Add Images', 'wp-frontend-editor' ) . '
                </button>
            </div>
        </div>';
    }

    /**
     * Get HTML for a select field.
     *
     * @param array $field The field configuration.
     * @param mixed $value The field value.
     * @return string The select field HTML.
     */
    private function get_select_html( $field, $value ) {
        $choices = array();
        
        // Different field types have different ways of storing choices
        if ( isset( $field['choices'] ) ) {
            $choices = $field['choices'];
        } elseif ( isset( $field['post_type'] ) && 'post_object' === $field['type'] ) {
            $posts = get_posts( array(
                'post_type' => $field['post_type'],
                'posts_per_page' => -1,
                'orderby' => 'title',
                'order' => 'ASC',
            ) );
            
            foreach ( $posts as $post ) {
                $choices[ $post->ID ] = $post->post_title;
            }
        } elseif ( isset( $field['taxonomy'] ) && in_array( $field['type'], array( 'taxonomy', 'page_link' ), true ) ) {
            $terms = get_terms( array(
                'taxonomy' => $field['taxonomy'],
                'hide_empty' => false,
            ) );
            
            foreach ( $terms as $term ) {
                $choices[ $term->term_id ] = $term->name;
            }
        }
        
        if ( empty( $choices ) ) {
            return '<p>' . __( 'No choices available', 'wp-frontend-editor' ) . '</p>';
        }
        
        $multiple = isset( $field['multiple'] ) && $field['multiple'] ? ' multiple' : '';
        $name = $multiple ? 'wpfe-field[' . $field['key'] . '][]' : 'wpfe-field[' . $field['key'] . ']';
        
        $html = '<select id="wpfe-field-' . esc_attr( $field['key'] ) . '" 
            name="' . esc_attr( $name ) . '" 
            class="wpfe-input wpfe-select"' . $multiple . '>';
        
        if ( !empty( $field['placeholder'] ) ) {
            $html .= '<option value="">' . esc_html( $field['placeholder'] ) . '</option>';
        }
        
        foreach ( $choices as $key => $label ) {
            $selected = '';
            
            if ( $multiple && is_array( $value ) ) {
                $selected = in_array( $key, $value, true ) ? ' selected' : '';
            } else {
                $selected = $value == $key ? ' selected' : '';
            }
            
            $html .= '<option value="' . esc_attr( $key ) . '"' . $selected . '>' . esc_html( $label ) . '</option>';
        }
        
        $html .= '</select>';
        
        return $html;
    }

    /**
     * Get HTML for a checkbox field.
     *
     * @param array $field The field configuration.
     * @param array $value The field value.
     * @return string The checkbox field HTML.
     */
    private function get_checkbox_html( $field, $value ) {
        if ( empty( $field['choices'] ) ) {
            return '<p>' . __( 'No choices available', 'wp-frontend-editor' ) . '</p>';
        }
        
        if ( ! is_array( $value ) ) {
            $value = array();
        }
        
        $html = '<div class="wpfe-checkbox-wrapper">';
        
        foreach ( $field['choices'] as $key => $label ) {
            $checked = in_array( $key, $value, true ) ? ' checked' : '';
            
            $html .= '<label class="wpfe-checkbox-label">
                <input type="checkbox" 
                    name="wpfe-field[' . esc_attr( $field['key'] ) . '][]" 
                    value="' . esc_attr( $key ) . '"' . $checked . '
                    class="wpfe-input wpfe-checkbox">
                ' . esc_html( $label ) . '
            </label>';
        }
        
        $html .= '</div>';
        
        return $html;
    }

    /**
     * Get HTML for a radio field.
     *
     * @param array $field The field configuration.
     * @param mixed $value The field value.
     * @return string The radio field HTML.
     */
    private function get_radio_html( $field, $value ) {
        if ( empty( $field['choices'] ) ) {
            return '<p>' . __( 'No choices available', 'wp-frontend-editor' ) . '</p>';
        }
        
        $html = '<div class="wpfe-radio-wrapper">';
        
        foreach ( $field['choices'] as $key => $label ) {
            $checked = $value == $key ? ' checked' : '';
            
            $html .= '<label class="wpfe-radio-label">
                <input type="radio" 
                    name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
                    value="' . esc_attr( $key ) . '"' . $checked . '
                    class="wpfe-input wpfe-radio">
                ' . esc_html( $label ) . '
            </label>';
        }
        
        $html .= '</div>';
        
        return $html;
    }

    /**
     * Get HTML for a true/false field.
     *
     * @param array $field The field configuration.
     * @param bool  $value The field value.
     * @return string The true/false field HTML.
     */
    private function get_true_false_html( $field, $value ) {
        $label = isset( $field['message'] ) ? $field['message'] : __( 'Yes', 'wp-frontend-editor' );
        $checked = $value ? ' checked' : '';
        
        return '<label class="wpfe-true-false-label">
            <input type="checkbox" 
                name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
                value="1"' . $checked . '
                class="wpfe-input wpfe-true-false">
            ' . esc_html( $label ) . '
        </label>';
    }

    /**
     * Get HTML for a date picker field.
     *
     * @param array  $field The field configuration.
     * @param string $value The field value.
     * @return string The date picker HTML.
     */
    private function get_date_picker_html( $field, $value ) {
        $type = 'date';
        
        if ( 'date_time_picker' === $field['type'] ) {
            $type = 'datetime-local';
        } elseif ( 'time_picker' === $field['type'] ) {
            $type = 'time';
        }
        
        return '<input type="' . esc_attr( $type ) . '" id="wpfe-field-' . esc_attr( $field['key'] ) . '" 
            name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
            value="' . esc_attr( $value ) . '"
            class="wpfe-input wpfe-date-picker">';
    }

    /**
     * Get HTML for a color picker field.
     *
     * @param array  $field The field configuration.
     * @param string $value The field value.
     * @return string The color picker HTML.
     */
    private function get_color_picker_html( $field, $value ) {
        return '<input type="color" id="wpfe-field-' . esc_attr( $field['key'] ) . '" 
            name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
            value="' . esc_attr( $value ) . '"
            class="wpfe-input wpfe-color-picker">';
    }

    /**
     * Get HTML for a link field.
     *
     * @param array $field The field configuration.
     * @param array $value The field value.
     * @return string The link field HTML.
     */
    private function get_link_html( $field, $value ) {
        $url = isset( $value['url'] ) ? $value['url'] : '';
        $title = isset( $value['title'] ) ? $value['title'] : '';
        $target = isset( $value['target'] ) ? $value['target'] : '';
        
        $value_json = is_array( $value ) ? esc_attr( json_encode( $value ) ) : '';
        
        return '<div class="wpfe-link-field">
            <input type="hidden" id="wpfe-field-' . esc_attr( $field['key'] ) . '"
                name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
                value=\'' . $value_json . '\'
                class="wpfe-input wpfe-link-input">
            
            <div class="wpfe-link-inputs">
                <p>
                    <label>' . esc_html__( 'URL', 'wp-frontend-editor' ) . '</label>
                    <input type="url" class="wpfe-link-url wpfe-input" value="' . esc_attr( $url ) . '">
                </p>
                <p>
                    <label>' . esc_html__( 'Title', 'wp-frontend-editor' ) . '</label>
                    <input type="text" class="wpfe-link-title wpfe-input" value="' . esc_attr( $title ) . '">
                </p>
                <p>
                    <label class="wpfe-checkbox-label">
                        <input type="checkbox" class="wpfe-link-target" ' . checked( $target, '_blank', false ) . '>
                        ' . esc_html__( 'Open in new tab', 'wp-frontend-editor' ) . '
                    </label>
                </p>
            </div>
        </div>';
    }

    /**
     * Get HTML for a Google Map field.
     *
     * @param array $field The field configuration.
     * @param array $value The field value.
     * @return string The Google Map field HTML.
     */
    private function get_google_map_html( $field, $value ) {
        $address = isset( $value['address'] ) ? $value['address'] : '';
        $lat = isset( $value['lat'] ) ? $value['lat'] : '';
        $lng = isset( $value['lng'] ) ? $value['lng'] : '';
        
        $value_json = is_array( $value ) ? esc_attr( json_encode( $value ) ) : '';
        
        return '<div class="wpfe-google-map-field">
            <input type="hidden" id="wpfe-field-' . esc_attr( $field['key'] ) . '"
                name="wpfe-field[' . esc_attr( $field['key'] ) . ']" 
                value=\'' . $value_json . '\'
                class="wpfe-input wpfe-google-map-input">
            
            <div class="wpfe-google-map-inputs">
                <p>
                    <label>' . esc_html__( 'Address', 'wp-frontend-editor' ) . '</label>
                    <input type="text" class="wpfe-google-map-address wpfe-input" value="' . esc_attr( $address ) . '">
                </p>
                <div class="wpfe-admin-field-row">
                    <div class="wpfe-admin-field-col">
                        <p>
                            <label>' . esc_html__( 'Latitude', 'wp-frontend-editor' ) . '</label>
                            <input type="text" class="wpfe-google-map-lat wpfe-input" value="' . esc_attr( $lat ) . '">
                        </p>
                    </div>
                    <div class="wpfe-admin-field-col">
                        <p>
                            <label>' . esc_html__( 'Longitude', 'wp-frontend-editor' ) . '</label>
                            <input type="text" class="wpfe-google-map-lng wpfe-input" value="' . esc_attr( $lng ) . '">
                        </p>
                    </div>
                </div>
            </div>
        </div>';
    }

    /**
     * Get HTML for a repeater field.
     *
     * @param array $field The field configuration.
     * @param array $value The field value.
     * @return string The repeater field HTML.
     */
    private function get_repeater_html( $field, $value ) {
        if ( empty( $field['sub_fields'] ) ) {
            return '<p>' . __( 'No sub fields available', 'wp-frontend-editor' ) . '</p>';
        }
        
        if ( ! is_array( $value ) ) {
            $value = array();
        }
        
        $html = '<div class="wpfe-repeater" data-field-key="' . esc_attr( $field['key'] ) . '">';
        
        // Add rows
        $html .= '<div class="wpfe-repeater-rows">';
        
        if ( ! empty( $value ) ) {
            foreach ( $value as $i => $row ) {
                $html .= $this->get_repeater_row_html( $field, $row, $i );
            }
        }
        
        $html .= '</div>';
        
        // Add button
        $html .= '<button type="button" class="button wpfe-add-row">
            ' . esc_html__( 'Add Row', 'wp-frontend-editor' ) . '
        </button>';
        
        // Add template for new rows
        $html .= '<script type="text/template" class="wpfe-repeater-row-template">';
        $html .= $this->get_repeater_row_html( $field, array(), '{{index}}' );
        $html .= '</script>';
        
        $html .= '</div>';
        
        return $html;
    }

    /**
     * Get HTML for a repeater row.
     *
     * @param array  $field The field configuration.
     * @param array  $row The row data.
     * @param string $index The row index.
     * @return string The repeater row HTML.
     */
    private function get_repeater_row_html( $field, $row, $index ) {
        $html = '<div class="wpfe-repeater-row" data-row-index="' . esc_attr( $index ) . '">';
        
        $html .= '<div class="wpfe-repeater-row-handle">
            <span class="wpfe-repeater-row-order">' . esc_html( is_numeric( $index ) ? intval( $index ) + 1 : $index ) . '</span>
            <button type="button" class="wpfe-repeater-row-toggle">
                <span class="dashicons dashicons-arrow-down"></span>
            </button>
        </div>';
        
        $html .= '<div class="wpfe-repeater-row-content">';
        
        foreach ( $field['sub_fields'] as $sub_field ) {
            $sub_value = isset( $row[ $sub_field['key'] ] ) ? $row[ $sub_field['key'] ] : '';
            if ( empty( $sub_value ) && isset( $row[ $sub_field['name'] ] ) ) {
                $sub_value = $row[ $sub_field['name'] ];
            }
            
            $html .= '<div class="wpfe-field wpfe-repeater-sub-field" data-field-key="' . esc_attr( $sub_field['key'] ) . '">';
            $html .= '<label for="wpfe-field-' . esc_attr( $sub_field['key'] ) . '-' . esc_attr( $index ) . '">' . esc_html( $sub_field['label'] ) . '</label>';
            
            // Clone the sub field with a modified name
            $sub_field_clone = $sub_field;
            $sub_field_clone['key'] = $field['key'] . '[' . $index . '][' . $sub_field['key'] . ']';
            
            $html .= $this->get_field_input_html( $sub_field_clone, $sub_value );
            $html .= '</div>';
        }
        
        $html .= '<button type="button" class="button wpfe-remove-row">
            ' . esc_html__( 'Remove Row', 'wp-frontend-editor' ) . '
        </button>';
        
        $html .= '</div>'; // Close row content
        $html .= '</div>'; // Close row
        
        return $html;
    }

    /**
     * Get HTML for a flexible content field.
     *
     * @param array $field The field configuration.
     * @param array $value The field value.
     * @return string The flexible content field HTML.
     */
    private function get_flexible_content_html( $field, $value ) {
        if ( empty( $field['layouts'] ) ) {
            return '<p>' . __( 'No layouts available', 'wp-frontend-editor' ) . '</p>';
        }
        
        if ( ! is_array( $value ) ) {
            $value = array();
        }
        
        $html = '<div class="wpfe-flexible-content" data-field-key="' . esc_attr( $field['key'] ) . '">';
        
        // Add layouts
        $html .= '<div class="wpfe-flexible-content-layouts">';
        
        if ( ! empty( $value ) ) {
            foreach ( $value as $i => $layout ) {
                $layout_name = isset( $layout['acf_fc_layout'] ) ? $layout['acf_fc_layout'] : '';
                $layout_config = null;
                
                // Find the layout configuration
                foreach ( $field['layouts'] as $config ) {
                    if ( $config['name'] === $layout_name ) {
                        $layout_config = $config;
                        break;
                    }
                }
                
                if ( $layout_config ) {
                    $html .= $this->get_flexible_content_layout_html( $field, $layout_config, $layout, $i );
                }
            }
        }
        
        $html .= '</div>';
        
        // Add layout button
        $html .= '<div class="wpfe-flexible-content-add">';
        $html .= '<select class="wpfe-flexible-content-select">';
        $html .= '<option value="">' . esc_html__( 'Add Layout', 'wp-frontend-editor' ) . '</option>';
        
        foreach ( $field['layouts'] as $layout ) {
            $html .= '<option value="' . esc_attr( $layout['name'] ) . '">' . esc_html( $layout['label'] ) . '</option>';
        }
        
        $html .= '</select>';
        $html .= '<button type="button" class="button wpfe-add-layout">' . esc_html__( 'Add', 'wp-frontend-editor' ) . '</button>';
        $html .= '</div>';
        
        // Add templates for layouts
        foreach ( $field['layouts'] as $layout ) {
            $html .= '<script type="text/template" class="wpfe-flexible-content-layout-template" data-layout="' . esc_attr( $layout['name'] ) . '">';
            $html .= $this->get_flexible_content_layout_html( $field, $layout, array(), '{{index}}' );
            $html .= '</script>';
        }
        
        $html .= '</div>';
        
        return $html;
    }

    /**
     * Get HTML for a flexible content layout.
     *
     * @param array  $field The field configuration.
     * @param array  $layout The layout configuration.
     * @param array  $data The layout data.
     * @param string $index The layout index.
     * @return string The flexible content layout HTML.
     */
    private function get_flexible_content_layout_html( $field, $layout, $data, $index ) {
        $html = '<div class="wpfe-flexible-content-layout" data-layout="' . esc_attr( $layout['name'] ) . '" data-layout-index="' . esc_attr( $index ) . '">';
        
        $html .= '<div class="wpfe-flexible-content-layout-handle">
            <span class="wpfe-flexible-content-layout-type">' . esc_html( $layout['label'] ) . '</span>
            <button type="button" class="wpfe-flexible-content-layout-toggle">
                <span class="dashicons dashicons-arrow-down"></span>
            </button>
        </div>';
        
        $html .= '<div class="wpfe-flexible-content-layout-content">';
        
        // Add hidden field to store layout type
        $html .= '<input type="hidden" name="wpfe-field[' . esc_attr( $field['key'] ) . '][' . esc_attr( $index ) . '][acf_fc_layout]" value="' . esc_attr( $layout['name'] ) . '">';
        
        foreach ( $layout['sub_fields'] as $sub_field ) {
            $sub_value = isset( $data[ $sub_field['key'] ] ) ? $data[ $sub_field['key'] ] : '';
            if ( empty( $sub_value ) && isset( $data[ $sub_field['name'] ] ) ) {
                $sub_value = $data[ $sub_field['name'] ];
            }
            
            $html .= '<div class="wpfe-field wpfe-flexible-content-sub-field" data-field-key="' . esc_attr( $sub_field['key'] ) . '">';
            $html .= '<label for="wpfe-field-' . esc_attr( $sub_field['key'] ) . '-' . esc_attr( $index ) . '">' . esc_html( $sub_field['label'] ) . '</label>';
            
            // Clone the sub field with a modified name
            $sub_field_clone = $sub_field;
            $sub_field_clone['key'] = $field['key'] . '[' . $index . '][' . $sub_field['key'] . ']';
            
            $html .= $this->get_field_input_html( $sub_field_clone, $sub_value );
            $html .= '</div>';
        }
        
        $html .= '<button type="button" class="button wpfe-remove-layout">
            ' . esc_html__( 'Remove Layout', 'wp-frontend-editor' ) . '
        </button>';
        
        $html .= '</div>'; // Close layout content
        $html .= '</div>'; // Close layout
        
        return $html;
    }

    /**
     * Get HTML for a group field.
     *
     * @param array $field The field configuration.
     * @param array $value The field value.
     * @return string The group field HTML.
     */
    private function get_group_html( $field, $value ) {
        if ( empty( $field['sub_fields'] ) ) {
            return '<p>' . __( 'No sub fields available', 'wp-frontend-editor' ) . '</p>';
        }
        
        if ( ! is_array( $value ) ) {
            $value = array();
        }
        
        $html = '<div class="wpfe-group" data-field-key="' . esc_attr( $field['key'] ) . '">';
        $html .= '<div class="wpfe-group-fields">';
        
        foreach ( $field['sub_fields'] as $sub_field ) {
            $sub_value = isset( $value[ $sub_field['key'] ] ) ? $value[ $sub_field['key'] ] : '';
            if ( empty( $sub_value ) && isset( $value[ $sub_field['name'] ] ) ) {
                $sub_value = $value[ $sub_field['name'] ];
            }
            
            $html .= '<div class="wpfe-field wpfe-group-sub-field" data-field-key="' . esc_attr( $sub_field['key'] ) . '">';
            $html .= '<label for="wpfe-field-' . esc_attr( $sub_field['key'] ) . '">' . esc_html( $sub_field['label'] ) . '</label>';
            
            // Clone the sub field with a modified name
            $sub_field_clone = $sub_field;
            $sub_field_clone['key'] = $field['key'] . '[' . $sub_field['key'] . ']';
            
            $html .= $this->get_field_input_html( $sub_field_clone, $sub_value );
            $html .= '</div>';
        }
        
        $html .= '</div>'; // Close group fields
        $html .= '</div>'; // Close group
        
        return $html;
    }
}