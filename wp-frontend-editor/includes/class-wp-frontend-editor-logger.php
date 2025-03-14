<?php
/**
 * The logger class for WP Frontend Editor.
 *
 * @package WPFrontendEditor
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Logger class to handle logging for the frontend editor.
 */
class WP_Frontend_Editor_Logger {

    /**
     * Log table name
     *
     * @var string
     */
    private $table_name;

    /**
     * Log levels
     *
     * @var array
     */
    private $log_levels = array(
        'info'    => 'Info',
        'warning' => 'Warning',
        'error'   => 'Error',
        'success' => 'Success',
        'debug'   => 'Debug',
    );

    /**
     * Constructor.
     */
    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'wpfe_logs';

        // Create log table if it doesn't exist
        $this->create_log_table();
        
        // Register activation hook
        register_activation_hook( WPFE_PLUGIN_FILE, array( $this, 'create_log_table' ) );
        
        // Register AJAX handlers
        add_action( 'wp_ajax_wpfe_clear_logs', array( $this, 'ajax_clear_logs' ) );
        add_action( 'wp_ajax_wpfe_delete_log', array( $this, 'ajax_delete_log' ) );
        add_action( 'wp_ajax_wpfe_export_logs', array( $this, 'ajax_export_logs' ) );
    }

    /**
     * Create the log table.
     */
    public function create_log_table() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS {$this->table_name} (
            id BIGINT(20) NOT NULL AUTO_INCREMENT,
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            level VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            context TEXT NULL,
            user_id BIGINT(20) NULL,
            ip_address VARCHAR(100) NULL,
            url VARCHAR(255) NULL,
            PRIMARY KEY (id)
        ) $charset_collate;";
        
        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta( $sql );
    }

    /**
     * Log a message.
     *
     * @param string $level   Log level (info, warning, error, success, debug).
     * @param string $message The log message.
     * @param array  $context Additional context data (optional).
     * @return int|false The log ID on success, false on failure.
     */
    public function log( $level, $message, $context = array() ) {
        global $wpdb;
        
        if ( ! in_array( $level, array_keys( $this->log_levels ), true ) ) {
            $level = 'info';
        }
        
        $user_id = get_current_user_id();
        $ip_address = $this->get_user_ip();
        $url = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
        
        $data = array(
            'level'      => $level,
            'message'    => $message,
            'context'    => ! empty( $context ) ? wp_json_encode( $context ) : null,
            'user_id'    => $user_id,
            'ip_address' => $ip_address,
            'url'        => $url,
        );
        
        $result = $wpdb->insert( $this->table_name, $data );
        
        if ( $result ) {
            return $wpdb->insert_id;
        }
        
        return false;
    }
    
    /**
     * Log an info message.
     *
     * @param string $message The log message.
     * @param array  $context Additional context data (optional).
     * @return int|false The log ID on success, false on failure.
     */
    public function info( $message, $context = array() ) {
        return $this->log( 'info', $message, $context );
    }
    
    /**
     * Log a warning message.
     *
     * @param string $message The log message.
     * @param array  $context Additional context data (optional).
     * @return int|false The log ID on success, false on failure.
     */
    public function warning( $message, $context = array() ) {
        return $this->log( 'warning', $message, $context );
    }
    
    /**
     * Log an error message.
     *
     * @param string $message The log message.
     * @param array  $context Additional context data (optional).
     * @return int|false The log ID on success, false on failure.
     */
    public function error( $message, $context = array() ) {
        return $this->log( 'error', $message, $context );
    }
    
    /**
     * Log a success message.
     *
     * @param string $message The log message.
     * @param array  $context Additional context data (optional).
     * @return int|false The log ID on success, false on failure.
     */
    public function success( $message, $context = array() ) {
        return $this->log( 'success', $message, $context );
    }
    
    /**
     * Log a debug message.
     *
     * @param string $message The log message.
     * @param array  $context Additional context data (optional).
     * @return int|false The log ID on success, false on failure.
     */
    public function debug( $message, $context = array() ) {
        return $this->log( 'debug', $message, $context );
    }
    
    /**
     * Get all logs.
     *
     * @param array $args Query arguments.
     * @return array Logs with pagination data.
     */
    public function get_logs( $args = array() ) {
        global $wpdb;
        
        $defaults = array(
            'per_page'  => 20,
            'page'      => 1,
            'orderby'   => 'timestamp',
            'order'     => 'DESC',
            'level'     => '',
            'user_id'   => '',
            'search'    => '',
            'date_from' => '',
            'date_to'   => '',
        );
        
        $args = wp_parse_args( $args, $defaults );
        
        $per_page = absint( $args['per_page'] );
        $offset = ( absint( $args['page'] ) - 1 ) * $per_page;
        
        // Base query
        $query = "SELECT * FROM {$this->table_name} WHERE 1=1";
        $count_query = "SELECT COUNT(*) FROM {$this->table_name} WHERE 1=1";
        
        // Add filters
        $where = array();
        $where_count = array();
        
        // Filter by level
        if ( ! empty( $args['level'] ) ) {
            $where[] = $wpdb->prepare( "level = %s", $args['level'] );
            $where_count[] = $wpdb->prepare( "level = %s", $args['level'] );
        }
        
        // Filter by user
        if ( ! empty( $args['user_id'] ) ) {
            $where[] = $wpdb->prepare( "user_id = %d", $args['user_id'] );
            $where_count[] = $wpdb->prepare( "user_id = %d", $args['user_id'] );
        }
        
        // Filter by search
        if ( ! empty( $args['search'] ) ) {
            $search = '%' . $wpdb->esc_like( $args['search'] ) . '%';
            $where[] = $wpdb->prepare( "message LIKE %s", $search );
            $where_count[] = $wpdb->prepare( "message LIKE %s", $search );
        }
        
        // Filter by date range
        if ( ! empty( $args['date_from'] ) ) {
            $where[] = $wpdb->prepare( "timestamp >= %s", $args['date_from'] . ' 00:00:00' );
            $where_count[] = $wpdb->prepare( "timestamp >= %s", $args['date_from'] . ' 00:00:00' );
        }
        
        if ( ! empty( $args['date_to'] ) ) {
            $where[] = $wpdb->prepare( "timestamp <= %s", $args['date_to'] . ' 23:59:59' );
            $where_count[] = $wpdb->prepare( "timestamp <= %s", $args['date_to'] . ' 23:59:59' );
        }
        
        // Add where clause to query
        if ( ! empty( $where ) ) {
            $query .= ' AND ' . implode( ' AND ', $where );
            $count_query .= ' AND ' . implode( ' AND ', $where_count );
        }
        
        // Add order
        $orderby = sanitize_sql_orderby( $args['orderby'] . ' ' . $args['order'] );
        $query .= " ORDER BY {$orderby}";
        
        // Add pagination
        $query .= $wpdb->prepare( " LIMIT %d, %d", $offset, $per_page );
        
        // Get total count
        $total = $wpdb->get_var( $count_query );
        
        // Get logs
        $logs = $wpdb->get_results( $query );
        
        // Process logs
        foreach ( $logs as &$log ) {
            // Decode context JSON
            if ( ! empty( $log->context ) ) {
                $log->context = json_decode( $log->context, true );
            } else {
                $log->context = array();
            }
            
            // Format date for display
            $log->timestamp_formatted = mysql2date( 'M j, Y H:i:s', $log->timestamp );
            
            // Get user data
            if ( ! empty( $log->user_id ) ) {
                $user = get_userdata( $log->user_id );
                $log->user_name = $user ? $user->display_name : __( 'Unknown User', 'wp-frontend-editor' );
            } else {
                $log->user_name = __( 'Guest', 'wp-frontend-editor' );
            }
        }
        
        return array(
            'logs'       => $logs,
            'total'      => absint( $total ),
            'pages'      => ceil( $total / $per_page ),
            'page'       => absint( $args['page'] ),
            'per_page'   => $per_page,
        );
    }
    
    /**
     * Get log levels.
     *
     * @return array Log levels.
     */
    public function get_log_levels() {
        return $this->log_levels;
    }
    
    /**
     * Delete a log entry.
     *
     * @param int $log_id The log ID to delete.
     * @return bool True on success, false on failure.
     */
    public function delete_log( $log_id ) {
        global $wpdb;
        
        return $wpdb->delete(
            $this->table_name,
            array( 'id' => $log_id ),
            array( '%d' )
        );
    }
    
    /**
     * Clear all logs.
     *
     * @return bool True on success, false on failure.
     */
    public function clear_logs() {
        global $wpdb;
        
        return $wpdb->query( "TRUNCATE TABLE {$this->table_name}" );
    }
    
    /**
     * Get user IP address.
     *
     * @return string User IP address.
     */
    private function get_user_ip() {
        $ip = '127.0.0.1';
        
        if ( ! empty( $_SERVER['HTTP_CLIENT_IP'] ) ) {
            $ip = sanitize_text_field( wp_unslash( $_SERVER['HTTP_CLIENT_IP'] ) );
        } elseif ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
            $ip = sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) );
        } elseif ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
            $ip = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
        }
        
        return $ip;
    }
    
    /**
     * AJAX handler to clear logs.
     */
    public function ajax_clear_logs() {
        check_ajax_referer( 'wpfe_logs_nonce', 'nonce' );
        
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => __( 'You do not have permission to clear logs.', 'wp-frontend-editor' ) ) );
        }
        
        $result = $this->clear_logs();
        
        if ( $result ) {
            wp_send_json_success( array( 'message' => __( 'Logs cleared successfully.', 'wp-frontend-editor' ) ) );
        } else {
            wp_send_json_error( array( 'message' => __( 'Failed to clear logs.', 'wp-frontend-editor' ) ) );
        }
    }
    
    /**
     * AJAX handler to delete a log.
     */
    public function ajax_delete_log() {
        check_ajax_referer( 'wpfe_logs_nonce', 'nonce' );
        
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => __( 'You do not have permission to delete logs.', 'wp-frontend-editor' ) ) );
        }
        
        $log_id = isset( $_POST['log_id'] ) ? absint( $_POST['log_id'] ) : 0;
        
        if ( ! $log_id ) {
            wp_send_json_error( array( 'message' => __( 'Invalid log ID.', 'wp-frontend-editor' ) ) );
        }
        
        $result = $this->delete_log( $log_id );
        
        if ( $result ) {
            wp_send_json_success( array( 'message' => __( 'Log deleted successfully.', 'wp-frontend-editor' ) ) );
        } else {
            wp_send_json_error( array( 'message' => __( 'Failed to delete log.', 'wp-frontend-editor' ) ) );
        }
    }
    
    /**
     * AJAX handler to export logs.
     */
    public function ajax_export_logs() {
        check_ajax_referer( 'wpfe_logs_nonce', 'nonce' );
        
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => __( 'You do not have permission to export logs.', 'wp-frontend-editor' ) ) );
        }
        
        $args = array(
            'per_page'  => 1000,
            'page'      => 1,
            'level'     => isset( $_POST['level'] ) ? sanitize_text_field( wp_unslash( $_POST['level'] ) ) : '',
            'user_id'   => isset( $_POST['user_id'] ) ? absint( $_POST['user_id'] ) : '',
            'search'    => isset( $_POST['search'] ) ? sanitize_text_field( wp_unslash( $_POST['search'] ) ) : '',
            'date_from' => isset( $_POST['date_from'] ) ? sanitize_text_field( wp_unslash( $_POST['date_from'] ) ) : '',
            'date_to'   => isset( $_POST['date_to'] ) ? sanitize_text_field( wp_unslash( $_POST['date_to'] ) ) : '',
        );
        
        $logs_data = $this->get_logs( $args );
        $logs = $logs_data['logs'];
        
        if ( empty( $logs ) ) {
            wp_send_json_error( array( 'message' => __( 'No logs to export.', 'wp-frontend-editor' ) ) );
        }
        
        $csv_data = array();
        
        // Add CSV headers
        $csv_data[] = array(
            'ID',
            __( 'Timestamp', 'wp-frontend-editor' ),
            __( 'Level', 'wp-frontend-editor' ),
            __( 'Message', 'wp-frontend-editor' ),
            __( 'Context', 'wp-frontend-editor' ),
            __( 'User', 'wp-frontend-editor' ),
            __( 'IP Address', 'wp-frontend-editor' ),
            __( 'URL', 'wp-frontend-editor' ),
        );
        
        // Add log data
        foreach ( $logs as $log ) {
            $csv_data[] = array(
                $log->id,
                $log->timestamp,
                $log->level,
                $log->message,
                is_array( $log->context ) ? wp_json_encode( $log->context ) : $log->context,
                $log->user_name . ' (' . $log->user_id . ')',
                $log->ip_address,
                $log->url,
            );
        }
        
        // Generate CSV content
        $csv_content = '';
        foreach ( $csv_data as $row ) {
            $csv_content .= implode( ',', array_map( array( $this, 'csv_escape' ), $row ) ) . "\n";
        }
        
        $filename = 'wp-frontend-editor-logs-' . date( 'Y-m-d' ) . '.csv';
        
        // Send CSV as download
        header( 'Content-Type: text/csv; charset=utf-8' );
        header( 'Content-Disposition: attachment; filename=' . $filename );
        
        echo $csv_content;
        exit;
    }
    
    /**
     * Escape a string for CSV output.
     *
     * @param string $str String to escape.
     * @return string Escaped string.
     */
    private function csv_escape( $str ) {
        $str = str_replace( '"', '""', $str );
        return '"' . $str . '"';
    }
}