<?php
/**
 * Media handler class.
 * 
 * Handles media operations (images, galleries, etc.)
 *
 * @package WPFrontendEditor
 * @since 1.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Media handler class.
 * 
 * @since 1.0.0
 */
class WP_Frontend_Editor_Media_Handler {

    /**
     * Constructor.
     */
    public function __construct() {
        // Nothing to initialize
    }

    /**
     * Get image data for a specified attachment.
     * 
     * @param int $attachment_id The attachment ID.
     * @return array|WP_Error The image data or an error.
     */
    public function get_image_data( $attachment_id ) {
        // Check if attachment exists and user has permissions
        $attachment = get_post($attachment_id);
        if (!$attachment || $attachment->post_type !== 'attachment') {
            return new WP_Error(
                'wpfe_invalid_attachment',
                __( 'Attachment not found', 'wp-frontend-editor' )
            );
        }
        
        // Verify user has permission to view this attachment
        if (!current_user_can('edit_post', $attachment_id) && !current_user_can('edit_posts')) {
            return new WP_Error(
                'wpfe_permission_denied',
                __( 'You do not have permission to access this attachment', 'wp-frontend-editor' )
            );
        }
        
        // Get image data
        $full_image_url = wp_get_attachment_url( $attachment_id );
        $large_image_data = wp_get_attachment_image_src( $attachment_id, 'large' );
        $thumbnail_image_data = wp_get_attachment_image_src( $attachment_id, 'thumbnail' );
        $srcset = wp_get_attachment_image_srcset( $attachment_id, 'large' );
        $sizes = wp_get_attachment_image_sizes( $attachment_id, 'large' );
        
        return array(
            'id'     => $attachment_id,
            'url'    => $large_image_data ? $large_image_data[0] : $full_image_url,
            'width'  => $large_image_data ? $large_image_data[1] : null,
            'height' => $large_image_data ? $large_image_data[2] : null,
            'full'   => $full_image_url,
            'thumbnail_url' => $thumbnail_image_data ? $thumbnail_image_data[0] : $full_image_url,
            'srcset' => $srcset,
            'sizes'  => $sizes,
        );
    }
    
    /**
     * Get gallery data for multiple attachments.
     * 
     * @param array $attachment_ids The array of attachment IDs.
     * @return array|WP_Error The gallery data or an error.
     */
    public function get_gallery_data( $attachment_ids ) {
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
        
        return array(
            'images' => $gallery_data,
        );
    }
}