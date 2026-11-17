<?php
/**
 * SSL_Headless Theme Customizer
 *
 * @package SSL_Headless
 */

/**
 * Add postMessage support for site title and description for the Theme Customizer.
 *
 * @param WP_Customize_Manager $wp_customize Theme Customizer object.
 */
function ssl_headless_customize_register( $wp_customize ) {
	$wp_customize->get_setting( 'blogname' )->transport         = 'postMessage';
	$wp_customize->get_setting( 'blogdescription' )->transport  = 'postMessage';
	$wp_customize->get_setting( 'header_textcolor' )->transport = 'postMessage';

	if ( isset( $wp_customize->selective_refresh ) ) {
		$wp_customize->selective_refresh->add_partial(
			'blogname',
			array(
				'selector'        => '.site-title a',
				'render_callback' => 'ssl_headless_customize_partial_blogname',
			)
		);
		$wp_customize->selective_refresh->add_partial(
			'blogdescription',
			array(
				'selector'        => '.site-description',
				'render_callback' => 'ssl_headless_customize_partial_blogdescription',
			)
		);
	}
}
add_action( 'customize_register', 'ssl_headless_customize_register' );

/**
 * Render the site title for the selective refresh partial.
 *
 * @return void
 */
function ssl_headless_customize_partial_blogname() {
	bloginfo( 'name' );
}

/**
 * Render the site tagline for the selective refresh partial.
 *
 * @return void
 */
function ssl_headless_customize_partial_blogdescription() {
	bloginfo( 'description' );
}

/**
 * Binds JS handlers to make Theme Customizer preview reload changes asynchronously.
 */
function ssl_headless_customize_preview_js() {
	wp_enqueue_script( 'ssl-headless-customizer', get_template_directory_uri() . '/js/customizer.js', array( 'customize-preview' ), SSL_HEADLESS_VERSION, true );
}
add_action( 'customize_preview_init', 'ssl_headless_customize_preview_js' );
