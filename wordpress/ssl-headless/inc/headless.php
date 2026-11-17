<?php
/**
 * Headless setup for SSL Headless.
 *
 * WordPress is only the CMS: Next.js (repo root, deployed on Vercel) renders the site.
 * This file keeps the site-specific setup:
 *   1. ACF field groups saved/loaded as JSON in ./acf-json (versioned in Git, no manual import)
 *   2. Image sizes the frontend uses
 *   3. Admin tweaks for a headless site (comments off, notice pointing to the frontend)
 *
 * The connection to Next.js (REST settings, revalidation, previews, WPML fields) lives in the
 * Headless Bridge plugin, so it keeps working if the theme is ever switched.
 *
 * @package SSL_Headless
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -------------------------------------------------------------------------
 * 1. ACF local JSON
 *    Saving a field group in ACF writes ./acf-json/group_*.json; on another
 *    environment ACF shows "Sync available" under ACF → Field Groups.
 *    Commit the changed JSON together with the frontend change that uses it.
 * ---------------------------------------------------------------------- */
add_filter(
	'acf/settings/save_json',
	function () {
		return get_template_directory() . '/acf-json';
	}
);

add_filter(
	'acf/settings/load_json',
	function ( $paths ) {
		$paths[] = get_template_directory() . '/acf-json';
		return $paths;
	}
);

/* -------------------------------------------------------------------------
 * 2. Image sizes — included in ACF image arrays and featured-image sizes
 * ---------------------------------------------------------------------- */
add_action(
	'after_setup_theme',
	function () {
		add_image_size( 'card', 800, 450, true );    // PostCard (16:9).
		add_image_size( 'hero', 2400, 1350, false ); // Full-width heroes.
	}
);

/* -------------------------------------------------------------------------
 * 3. Admin tweaks
 * ---------------------------------------------------------------------- */

// Comments aren't rendered by the frontend: turn them off everywhere.
add_action(
	'init',
	function () {
		foreach ( get_post_types_by_support( 'comments' ) as $post_type ) {
			remove_post_type_support( $post_type, 'comments' );
			remove_post_type_support( $post_type, 'trackbacks' );
		}
	},
	100
);
add_filter( 'comments_open', '__return_false', 20 );
add_filter( 'pings_open', '__return_false', 20 );
add_filter( 'comments_array', '__return_empty_array', 10 );
add_action(
	'admin_menu',
	function () {
		remove_menu_page( 'edit-comments.php' );
	}
);
add_action(
	'wp_before_admin_bar_render',
	function () {
		global $wp_admin_bar;
		$wp_admin_bar->remove_menu( 'comments' );
	}
);

// Explain on the Themes screen where the site is rendered.
add_action(
	'admin_notices',
	function () {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'themes' !== $screen->id ) {
			return;
		}
		$frontend = defined( 'HEADLESS_FRONTEND_URL' ) ? HEADLESS_FRONTEND_URL : '';
		echo '<div class="notice notice-info"><p>';
		echo esc_html__( 'This is a headless site: pages are rendered by Next.js, not by this theme.', 'ssl-headless' );
		if ( $frontend ) {
			echo ' <a href="' . esc_url( $frontend ) . '" target="_blank" rel="noopener">' . esc_html( $frontend ) . '</a>';
		}
		echo '</p></div>';
	}
);
