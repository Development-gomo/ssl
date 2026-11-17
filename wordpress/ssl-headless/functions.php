<?php
/**
 * SSL Headless — child theme of Twenty Twenty-Five.
 *
 * WordPress is only the CMS: Next.js (repo root, deployed on Vercel) renders the site.
 * What lives here is site-specific setup:
 *   1. ACF field groups saved/loaded as JSON in ./acf-json (versioned in Git, no manual import)
 *   2. Theme supports + image sizes the frontend uses
 *   3. Editor/admin tweaks for a headless site
 *
 * Connection to Next.js (REST settings, revalidation, previews, WPML fields) lives in the
 * Headless Bridge plugin — it keeps working if the theme is ever switched.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SSL_HEADLESS_DIR', get_stylesheet_directory() );

/* -------------------------------------------------------------------------
 * 1. ACF local JSON
 *    Field groups are stored in ./acf-json. Saving a field group in ACF writes the
 *    JSON file here; on another environment ACF shows "Sync available" under
 *    ACF → Field Groups. Commit the changed JSON with the frontend change that uses it.
 * ---------------------------------------------------------------------- */
add_filter( 'acf/settings/save_json', function () {
	return SSL_HEADLESS_DIR . '/acf-json';
} );

add_filter( 'acf/settings/load_json', function ( $paths ) {
	$paths[] = SSL_HEADLESS_DIR . '/acf-json';
	return $paths;
} );

/* -------------------------------------------------------------------------
 * 2. Theme supports + image sizes
 *    Next.js reads featured images and ACF image arrays (which include these sizes).
 * ---------------------------------------------------------------------- */
add_action( 'after_setup_theme', function () {
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'title-tag' );

	add_image_size( 'card', 800, 450, true );   // PostCard (16:9)
	add_image_size( 'hero', 2400, 1350, false ); // full-width heroes
} );

/* -------------------------------------------------------------------------
 * 3. Editor / admin tweaks
 * ---------------------------------------------------------------------- */

// Comments aren't rendered by the frontend: turn them off everywhere.
add_action( 'init', function () {
	foreach ( get_post_types_by_support( 'comments' ) as $post_type ) {
		remove_post_type_support( $post_type, 'comments' );
		remove_post_type_support( $post_type, 'trackbacks' );
	}
}, 100 );
add_filter( 'comments_open', '__return_false', 20 );
add_filter( 'pings_open', '__return_false', 20 );
add_filter( 'comments_array', '__return_empty_array', 10 );
add_action( 'admin_menu', function () {
	remove_menu_page( 'edit-comments.php' );
} );
add_action( 'wp_before_admin_bar_render', function () {
	global $wp_admin_bar;
	$wp_admin_bar->remove_menu( 'comments' );
} );

// The Site Editor edits the WordPress theme's own templates, which visitors never see —
// hide it so editors don't change things that have no effect.
add_action( 'admin_menu', function () {
	remove_submenu_page( 'themes.php', 'site-editor.php' );
}, 100 );

// Explain in the admin where the site is rendered.
add_action( 'admin_notices', function () {
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
} );
