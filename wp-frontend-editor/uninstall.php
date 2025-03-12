<?php
/**
 * Uninstall WP Frontend Editor
 *
 * @package WPFrontendEditor
 */

// If uninstall not called from WordPress, exit
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Delete options
delete_option( 'wpfe_options' );
delete_option( 'wpfe_version' );