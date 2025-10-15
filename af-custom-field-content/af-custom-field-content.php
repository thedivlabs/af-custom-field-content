<?php
/**
 * Plugin Name: Custom Field Content
 * Description: A plugin that provides a block that displays ACF custom field content.
 * Author: Alex Ferrao
 * Version: 1.0.0
 * Text Domain: AF
 */

if ( ! defined( 'ABSPATH' ) || ! class_exists( 'ACF' ) ) {
	exit;
}

class AF_Custom_Field_Content {

	/** @var AF_Custom_Field_Content|null */
	private static AF_Custom_Field_Content|null $instance = null;

	private function __construct() {

		// Initialize defaults
		add_action( 'init', [ $this, 'init_class' ], 5 );

		// Initialize blocks
		add_action( 'init', [ $this, 'register_blocks' ], 10 );

	}

	public function init_class(): void {

	}

	/**
	 * Register all compiled blocks
	 */
	public function register_blocks(): void {

		$blocks_dir = glob( plugin_dir_path( __FILE__ ) . '/blocks/*', GLOB_ONLYDIR );

		foreach ( $blocks_dir as $block_dir ) {
			register_block_type( $block_dir );
		}
	}

	/**
	 * Log to the browser console (admin + frontend)
	 */
	public static function console_log( $log_data ): void {
		add_action( 'admin_footer', function () use ( $log_data ) {
			echo '<script>console.log(' . wp_json_encode( $log_data ) . ')</script>';
		} );

		add_action( 'wp_footer', function () use ( $log_data ) {
			echo '<script>console.log(' . wp_json_encode( $log_data ) . ')</script>';
		} );
	}

	/**
	 * Initialize the singleton instance
	 */
	public static function init(): AF_Custom_Field_Content {
		if ( self::$instance === null ) {
			self::$instance = new self();
		}

		return self::$instance;
	}
}

AF_Custom_Field_Content::init();
