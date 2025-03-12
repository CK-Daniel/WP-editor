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
                }
            });
        })(jQuery);
        </script>
        <?php
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
            }
        }

        return $field_selectors;
    }

    /**
     * Get the CSS selector for an ACF field.
     *
     * @param array $field The field configuration.
     * @param mixed $value The field value.
     * @return string|false The CSS selector or false if not found.
     */
    private function get_acf_field_selector( $field, $value ) {
        // Build selector based on field name
        $selector = '.acf-field-' . $field['name'];
        
        // Alternative selectors based on field type
        $selectors = array(
            $selector,
            '[data-acf-field="' . $field['name'] . '"]',
            '[data-field-name="' . $field['name'] . '"]',
            '#acf-' . $field['name'],
        );

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

        // Generate edit button
        return '<button class="wpfe-edit-button" data-wpfe-field="' . esc_attr( $field_key ) . '" data-wpfe-post-id="' . esc_attr( $post_id ) . '" data-wpfe-field-type="acf">
            <span class="dashicons dashicons-edit"></span>
            <span class="screen-reader-text">' . esc_html__( 'Edit', 'wp-frontend-editor' ) . '</span>
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
                
            case 'select':
                $html = $this->get_select_html( $field, $value );
                break;
                
            case 'checkbox':
                $html = $this->get_checkbox_html( $field, $value );
                break;
                
            case 'radio':
                $html = $this->get_radio_html( $field, $value );
                break;
                
            case 'true_false':
                $html = $this->get_true_false_html( $field, $value );
                break;
                
            case 'repeater':
                $html = $this->get_repeater_html( $field, $value );
                break;
                
            case 'flexible_content':
                $html = $this->get_flexible_content_html( $field, $value );
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
        
        if ( 'number' === $type ) {
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
            if ( 'image' === $type ) {
                $image_url = wp_get_attachment_image_url( $value, 'thumbnail' );
                $preview_html = '<div class="wpfe-image-preview">
                    <img src="' . esc_url( $image_url ) . '" alt="">
                </div>';
            } else {
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
     * Get HTML for a select field.
     *
     * @param array $field The field configuration.
     * @param mixed $value The field value.
     * @return string The select field HTML.
     */
    private function get_select_html( $field, $value ) {
        if ( empty( $field['choices'] ) ) {
            return '<p>' . __( 'No choices available', 'wp-frontend-editor' ) . '</p>';
        }
        
        $multiple = isset( $field['multiple'] ) && $field['multiple'] ? ' multiple' : '';
        $name = $multiple ? 'wpfe-field[' . $field['key'] . '][]' : 'wpfe-field[' . $field['key'] . ']';
        
        $html = '<select id="wpfe-field-' . esc_attr( $field['key'] ) . '" 
            name="' . esc_attr( $name ) . '" 
            class="wpfe-input wpfe-select"' . $multiple . '>';
        
        foreach ( $field['choices'] as $key => $label ) {
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
            <span class="wpfe-repeater-row-order">' . esc_html( intval( $index ) + 1 ) . '</span>
            <button type="button" class="wpfe-repeater-row-toggle">
                <span class="dashicons dashicons-arrow-down"></span>
            </button>
        </div>';
        
        $html .= '<div class="wpfe-repeater-row-content">';
        
        foreach ( $field['sub_fields'] as $sub_field ) {
            $sub_value = isset( $row[ $sub_field['key'] ] ) ? $row[ $sub_field['key'] ] : '';
            
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
}