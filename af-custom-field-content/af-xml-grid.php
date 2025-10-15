<?php
/**
 * Plugin Name: XML Grid
 * Description: A plugin that provides an XML Grid block for displaying XML feeds.
 * Author: Alex Ferrao
 * Version: 1.0.0
 * Text Domain: AF
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AF {

	/** @var AF|null */
	private static AF|null $instance = null;

	/** @var array */
	private static array $breakpoints;

	private function __construct() {

		// Initialize defaults
		add_action( 'init', [ $this, 'init_class' ], 5 );

		// Initialize blocks
		add_action( 'init', [ $this, 'register_blocks' ], 10 );

		// Expose custom settings to the editor
		add_action( 'enqueue_block_editor_assets', [ $this, 'expose_custom_settings_editor' ] );

		// Output frontend styles per block
		add_filter( 'render_block_data', [ $this, 'output_block_styles' ] );

		// Register endpoint
		add_action( 'rest_api_init', [ $this, 'define_rest_endpoint' ] );

	}

	public function define_rest_endpoint(): void {
		register_rest_route( 'af/v1', '/xml-feed', [
			'methods'             => 'GET',
			'callback'            => [ $this, 'af_get_xml_feed' ],
			'permission_callback' => '__return_true',
			'args'                => [
				'feed'       => [
					'required' => true,
					'type'     => 'string'
				],
				'dateFormat' => [
					'required' => false,
					'type'     => 'string'
				],
				'imageSize'  => [
					'required' => false,
					'type'     => 'string'
				],
			],
		] );
	}

	public function init_class(): void {

		self::$breakpoints = wp_get_global_settings( [ 'custom' ] )['breakpoints'] ?? [
			'xs'     => [
				'label' => 'Extra Small',
				'size'  => 520,
			],
			'sm'     => [
				'label' => 'Small',
				'size'  => 768,
			],
			'md'     => [
				'label' => 'Medium',
				'size'  => 1040,
			],
			'normal' => [
				'label' => 'Normal',
				'size'  => 1240,
			],
			'lg'     => [
				'label' => 'Large',
				'size'  => 1304,
			],
		];

	}

	public function af_get_xml_feed( WP_REST_Request $request ): WP_REST_Response {
		$feed        = $request->get_param( 'feed' );
		$date_format = $request->get_param( 'dateFormat' );
		$image_size  = $request->get_param( 'imageSize' );

		$feed_url = ( wp_get_global_settings( [ 'custom' ] )['xml'] ?? [
			'wired' => 'https://www.wired.com/feed/',
		] )[ $feed ] ?? false;

		if ( empty( $feed_url ) ) {
			return new WP_REST_Response( [ 'error' => 'Invalid feed' ], 400 );
		}

		$cache_key = 'af_xml_feed_' . md5( $feed_url );
		$cached    = get_transient( $cache_key );

		if ( $cached !== false ) {
			$response = $cached;
		} else {
			$response = wp_remote_get( $feed_url, [ 'timeout' => 10 ] );

			// Cache the full list for 1 hour
			set_transient( $cache_key, $response, HOUR_IN_SECONDS );
		}

		if ( is_wp_error( $response ) ) {
			delete_transient( $cache_key );

			return new WP_REST_Response( [ 'error' => $response->get_error_message() ], 500 );
		}

		$body = wp_remote_retrieve_body( $response );
		if ( empty( $body ) ) {
			return new WP_REST_Response( [ 'error' => 'Empty feed body' ], 500 );
		}

		// Parse XML
		$xml = @simplexml_load_string( $body, 'SimpleXMLElement', LIBXML_NOCDATA );
		if ( ! $xml ) {
			return new WP_REST_Response( [ 'error' => 'Invalid XML' ], 500 );
		}

		$items = [];
		foreach ( $xml->channel->item as $item ) {
			$ns_media = $item->children( 'media', true );
			$ns_dc    = $item->children( 'dc', true );

			$thumbnail = null;
			if ( isset( $ns_media->thumbnail ) && $ns_media->thumbnail->attributes() ) {
				$attrs = $ns_media->thumbnail->attributes();
				if ( isset( $attrs['url'] ) ) {
					$thumbnail = (string) $attrs['url'];

					// Apply custom size if requested
					if ( $image_size ) {
						$size = 'w_' . $image_size;
						// Example: insert "w_200" before the filename
						$thumbnail = preg_replace(
							'#/master/pass/#',
							"/master/pass/{$size}/",
							$thumbnail
						);
					}
				}
			}

			$raw_date       = (string) $item->pubDate;
			$formatted_date = $raw_date; // default fallback

			try {
				$dt = new DateTime( $raw_date );
				// Always prefer param if provided, otherwise fallback to default
				if ( ! empty( $date_format ) ) {
					$formatted_date = $dt->format( $date_format );
				} else {
					// Default format (e.g. "October 8, 2025")
					$formatted_date = $dt->format( 'F j, Y' );
				}
			} catch ( Exception $e ) {
				// leave as raw string if parsing fails
			}

			$items[] = [
				'guid'        => (string) $item->guid,
				'title'       => (string) $item->title,
				'link'        => (string) $item->link,
				'description' => (string) $item->description,
				'content'     => isset( $item->{'content:encoded'} ) ? (string) $item->{'content:encoded'} : '',
				'thumbnail'   => $thumbnail,
				'author'      => isset( $ns_dc->creator ) ? (string) $ns_dc->creator : null,
				'pubDate'     => $formatted_date,
				'category'    => (string) $item->category,
			];


		}

		return new WP_REST_Response( [
			'items'  => $items,
		], 200 );
	}

	/**
	 * Output frontend styles per block
	 */
	public function output_block_styles( $parsed_block ): array {
		if ( ! str_starts_with( ( $parsed_block['blockName'] ?? '' ), 'af/' ) || did_action( 'wp_head' ) ) {
			return $parsed_block;
		}

		$settings    = $parsed_block['attrs']['settings'] ?? [];
		$instance_id = $settings['instanceId'] ?? null;
		$css         = $settings['css'] ?? [];

		if ( ! $instance_id || empty( $css ) ) {
			return $parsed_block;
		}

		// Breakpoints from theme.json with default values
		// Add/Manage these options in "settings" → "custom"
		$breakpoints = &self::$breakpoints;

		// Selector: block name (slash → dash) + instanceId
		$parsed_name = str_replace( '/', '-', $parsed_block['blockName'] );
		$selector    = '.' . $parsed_name . '.' . $instance_id;

		$rules = [];

		// Base (always apply)
		if ( ! empty( $css['base'] ) && is_array( $css['base'] ) ) {
			$vars = '';
			foreach ( $css['base'] as $key => $val ) {
				$vars .= sanitize_key( $key ) . ':' . esc_attr( $val ) . ';';
			}
			if ( ! empty( $vars ) ) {
				$rules[] = "{$selector}{{$vars}}";
			}
		}

		// Responsive
		if ( ! empty( $css['responsive'] ) && is_array( $css['responsive'] ) ) {

			uksort(
				$css['responsive'],
				function ( string $a, string $b ) use ( $breakpoints ): int {
					$sizeA = (int) ( $breakpoints[ $a ]['size'] ?? 0 );
					$sizeB = (int) ( $breakpoints[ $b ]['size'] ?? 0 );

					return $sizeB <=> $sizeA; // reverse order
				}
			);

			foreach ( $css['responsive'] as $bp_key => $vars ) {
				if ( empty( $breakpoints[ $bp_key ]['size'] ) ) {
					continue;
				}

				$vars_str = '';
				foreach ( $vars as $key => $val ) {
					$vars_str .= esc_attr( $key ) . ':' . esc_attr( $val ) . ';';
				}

				if ( ! empty( $vars_str ) ) {
					$bp_size = (int) $breakpoints[ $bp_key ]['size'] - 1;
					$rules[] = '@media(max-width:' . $bp_size . 'px){' . $selector . '{' . $vars_str . '}}';
				}
			}
		}

		if ( ! empty( $rules ) ) {
			$css_str = implode( ' ', $rules );

			// Print CSS in <head>
			add_action( 'wp_head', function () use ( $css_str, $parsed_name ): void {
				echo '<style id="' . $parsed_name . '-styles">' . $css_str . '</style>';
			} );
		}

		return $parsed_block;
	}

	/**
	 * Expose custom settings to the editor
	 */
	public function expose_custom_settings_editor(): void {

		$settings = [
			'breakpoints' => self::$breakpoints,
		];

		wp_add_inline_script(
			'wp-blocks',
			'window.AF = ' . wp_json_encode( $settings ) . ';',
			'before'
		);
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
	public static function init(): AF {
		if ( self::$instance === null ) {
			self::$instance = new self();
		}

		return self::$instance;
	}
}

AF::init();
