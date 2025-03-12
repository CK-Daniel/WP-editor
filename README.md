# WP Frontend Editor

A fully native WordPress plugin that allows front-end editing of static content, native WordPress fields, and Advanced Custom Fields (ACF), including repeater and nested fields.

## Features

- Front-end inline editing with intuitive controls
- Support for all native WordPress fields (title, content, excerpt)
- Advanced Custom Fields support including complex field types:
  - Repeaters
  - Flexible Content
  - Groups
  - Images and Galleries
  - WYSIWYG Editors
  - And many more
- Real-time preview of edits
- Built with security and performance in mind
- Compatible with any theme

## Code Structure

The plugin follows a modular architecture for maintainability and flexibility:

```
wp-frontend-editor/
├── wp-frontend-editor.php           # Main plugin file
├── includes/                         # Core functionality
│   ├── class-wp-frontend-editor.php  # Main plugin class
│   ├── class-wp-frontend-editor-admin.php # Admin functionality
│   ├── class-wp-frontend-editor-ajax.php  # Main AJAX handler
│   ├── class-wp-frontend-editor-acf.php   # ACF integration
│   ├── ajax/                         # Modular AJAX components
│       ├── class-wp-frontend-editor-ajax-base.php    # Base AJAX functionality
│       ├── class-wp-frontend-editor-acf-utils.php    # ACF utility functions
│       ├── class-wp-frontend-editor-field-renderer.php # Field rendering
│       ├── class-wp-frontend-editor-fields-handler.php # Field data handling
│       ├── class-wp-frontend-editor-form-handler.php   # Form processing
│       ├── class-wp-frontend-editor-media-handler.php  # Media handling
│       └── class-wp-frontend-editor-rest-handler.php   # REST API endpoints
├── public/                           # Front-end assets
│   ├── css/
│   ├── js/
│   └── templates/
└── languages/                        # Translations
```

### Class Responsibilities

- **WP_Frontend_Editor**: Main plugin class that initializes all components and handles hooks.
- **WP_Frontend_Editor_Admin**: Handles all admin-related functionality like settings pages.
- **WP_Frontend_Editor_AJAX**: Main AJAX controller that coordinates with specialized handlers.
- **WP_Frontend_Editor_ACF**: Integration with Advanced Custom Fields.

#### AJAX Modules:

- **WP_Frontend_Editor_AJAX_Base**: Base class with common AJAX functionality.
- **WP_Frontend_Editor_ACF_Utils**: Utility functions for working with ACF fields.
- **WP_Frontend_Editor_Field_Renderer**: Renders complex field types.
- **WP_Frontend_Editor_Fields_Handler**: Handles field data retrieval and saving.
- **WP_Frontend_Editor_Form_Handler**: Processes form submissions with validation.
- **WP_Frontend_Editor_Media_Handler**: Specialized handling for media fields.
- **WP_Frontend_Editor_REST_Handler**: Handles REST API endpoints for the editor.

## Further Development

The modular structure makes it easy to add new features:

1. To add support for a new field type, extend the Field_Renderer class.
2. To add new validation rules, extend the Form_Handler class.
3. To add new REST API endpoints, extend the REST_Handler class.

## Security

The plugin implements several security measures:

- Nonce verification for all AJAX and REST requests
- Permission checks for all operations
- Data sanitization and validation
- Controlled output escaping

## Performance

- Optimized for minimal database queries
- Caching for frequently accessed data
- Lazy loading of components
- Efficient field lookups with caching