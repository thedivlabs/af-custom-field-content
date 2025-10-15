<?php

$settings    = $attributes['wpbs-acf-field-content'] ?? [];
$field_key   = $settings['field'] ?? '';
$date_format = $settings['dateFormat'] ?? '';

if ( ! $field_key ) {
	return '';
}

// convert dot.notation to underscore_notation
$field_name = str_replace( '.', '_', $field_key );

// fetch value directly from ACF
$value = get_field( 'wpbs_' . $field_name, get_the_ID() );

if ( empty( $value ) || ! is_string( $value ) ) {
	return '';
}

// handle date formatting if requested
if ( $date_format && strtotime( $value ) !== false ) {
	$value = date_i18n( $date_format, strtotime( $value ) );
}

// replace placeholder with value
$result = str_replace( "__FIELD_CONTENT__", esc_html( $value ), ( $content ?? '' ) );

echo $result;
