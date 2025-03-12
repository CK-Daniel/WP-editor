<?php
/**
 * Base AJAX handler class.
 * 
 * Provides common functionality for AJAX handlers.
 *
 * @package WPFrontendEditor
 * @since 1.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Base AJAX handler class.
 * 
 * @since 1.0.0
 */
abstract class WP_Frontend_Editor_AJAX_Base {

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
}