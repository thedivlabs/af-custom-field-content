<?php
/**
 * Plugin Name: Custom Field Content
 * Description: A plugin that provides a block that displays ACF custom field content.
 * Author: Alex Ferrao
 * Version: 1.0.0
 * Text Domain: AF
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AF_Custom_Field_Content {

	private static ?AF_Custom_Field_Content $instance = null;

	private function __construct() {
		// If ACF not active, bail after showing notice
		if ( ! class_exists( 'ACF' ) ) {
			add_action( 'admin_notices', [ $this, 'acf_missing_notice' ] );
			return;
		}

		add_action( 'init', [ $this, 'init_class' ], 5 );
		add_action( 'init', [ $this, 'register_blocks' ], 10 );
	}

	public function init_class(): void {}

	public function register_blocks(): void {
		$blocks_dir = glob( plugin_dir_path( __FILE__ ) . 'blocks/*', GLOB_ONLYDIR ) ?: [];
		foreach ( $blocks_dir as $block_dir ) {
			register_block_type( $block_dir );
		}
	}

	public function acf_missing_notice(): void {
		echo '<div class="notice notice-error"><p>'
		     . esc_html__( 'Custom Field Content requires Advanced Custom Fields (ACF) to be installed and active.', 'AF' )
		     . '</p></div>';
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

	public static function init(): AF_Custom_Field_Content {
		if ( self::$instance === null ) {
			self::$instance = new self();
		}
		return self::$instance;
	}
}

AF_Custom_Field_Content::init();
