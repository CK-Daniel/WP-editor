<?php
/**
 * Field renderer class.
 * 
 * Handles rendering of complex field types.
 *
 * @package WPFrontendEditor
 * @since 1.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Field renderer class.
 * 
 * @since 1.0.0
 */
class WP_Frontend_Editor_Field_Renderer {

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
    public function render_field_value($value, $field_data) {
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
                    $json_data = json_encode($value, JSON_PRETTY_PRINT);
                    if ($json_data === false) {
                        // Handle JSON encoding errors
                        return '<span class="acf-empty-value">' . esc_html__('(Unable to display value)', 'wp-frontend-editor') . '</span>';
                    }
                    return '<pre class="acf-json-data">' . esc_html($json_data) . '</pre>';
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
    public function render_acf_repeater($field_name, $post_id, $field_object) {
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
    public function render_acf_flexible_content($field_name, $post_id, $field_object) {
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
    public function render_acf_group($field_name, $post_id, $field_object, $value = null) {
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
}