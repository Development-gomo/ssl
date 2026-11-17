<?php
/**
 * Plugin Name: Headless Bridge (Next.js)
 * Description: Connects WordPress to a Next.js frontend: settings/menu endpoint, on-demand revalidation, draft previews, frontend redirects and an example CPT.
 * Version:     1.1.0
 *
 * Install as a normal plugin (upload the headless-bridge folder as a zip) or drop this file into wp-content/mu-plugins/, then add the constants below to wp-config.php:
 *
 *   define( 'HEADLESS_FRONTEND_URL', 'https://www.example.com' );      // Next.js site, no trailing slash
 *   define( 'HEADLESS_REVALIDATE_SECRET', 'long-random-string' );      // must match REVALIDATE_SECRET in Next.js
 *   define( 'HEADLESS_PREVIEW_SECRET', 'another-long-random-string' ); // must match PREVIEW_SECRET in Next.js
 *   define( 'HEADLESS_REDIRECT_FRONTEND', true );                      // optional: send visitors of WP's own theme to Next.js
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -------------------------------------------------------------------------
 * 0. Application Password fallback for hosts that strip the Authorization
 *    header (common on SiteGround / Apache + PHP-FPM). Runs at load time,
 *    before WordPress authenticates the request. Clients may also send the
 *    same "Basic …" value in an X-Authorization header.
 * ---------------------------------------------------------------------- */
if ( empty( $_SERVER['PHP_AUTH_USER'] ) ) {
	$headless_auth = '';
	foreach ( array( 'HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION', 'HTTP_X_AUTHORIZATION' ) as $headless_key ) {
		if ( ! empty( $_SERVER[ $headless_key ] ) ) {
			$headless_auth = $_SERVER[ $headless_key ];
			break;
		}
	}
	if ( ! $headless_auth && function_exists( 'getallheaders' ) ) {
		foreach ( getallheaders() as $headless_name => $headless_value ) {
			if ( in_array( strtolower( $headless_name ), array( 'authorization', 'x-authorization' ), true ) ) {
				$headless_auth = $headless_value;
				break;
			}
		}
	}
	if ( $headless_auth && 0 === stripos( $headless_auth, 'basic ' ) ) {
		$headless_decoded = base64_decode( substr( $headless_auth, 6 ), true );
		if ( $headless_decoded && false !== strpos( $headless_decoded, ':' ) ) {
			list( $_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW'] ) = explode( ':', $headless_decoded, 2 );
		}
	}
	unset( $headless_auth, $headless_key, $headless_name, $headless_value, $headless_decoded );
}

function headless_frontend_url() {
	return defined( 'HEADLESS_FRONTEND_URL' ) ? untrailingslashit( HEADLESS_FRONTEND_URL ) : '';
}

/* -------------------------------------------------------------------------
 * 1. Example custom post type + menu locations
 *    Every CPT you want in Next.js needs show_in_rest => true.
 *    Remove this block if you register CPTs elsewhere (ACF, CPT UI, theme).
 * ---------------------------------------------------------------------- */
add_action( 'init', function () {
	register_post_type( 'project', array(
		'label'        => 'Projects',
		'public'       => true,
		'show_in_rest' => true,          // required for the REST API
		'rest_base'    => 'projects',    // /wp-json/wp/v2/projects
		'has_archive'  => false,
		'menu_icon'    => 'dashicons-portfolio',
		'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'custom-fields' ),
		'rewrite'      => array( 'slug' => 'projects' ),
	) );

	register_nav_menus( array(
		'primary' => 'Primary menu',
		'footer'  => 'Footer menu',
	) );
} );

/* -------------------------------------------------------------------------
 * 2. /wp-json/headless/v1/settings — site info, front page and menus
 *    (core's menu endpoints require authentication, this one is public)
 * ---------------------------------------------------------------------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'headless/v1', '/settings', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => 'headless_settings_endpoint',
	) );

	// Page path (e.g. "about/team") so Next.js can resolve nested pages.
	register_rest_field( 'page', 'uri', array(
		'get_callback' => function ( $post ) {
			return get_page_uri( $post['id'] );
		},
		'schema'       => array( 'type' => 'string' ),
	) );
} );

function headless_settings_endpoint() {
	$front_id = (int) get_option( 'page_on_front' );
	$menus    = array();

	foreach ( get_nav_menu_locations() as $location => $menu_id ) {
		$items = wp_get_nav_menu_items( $menu_id );
		$items = $items ? $items : array();
		$menus[ $location ] = array_map( function ( $item ) {
			return array(
				'id'     => (int) $item->ID,
				'parent' => (int) $item->menu_item_parent,
				'title'  => html_entity_decode( $item->title ),
				'url'    => headless_relative_url( $item->url ),
				'target' => $item->target,
			);
		}, $items );
	}

	return array(
		'name'        => html_entity_decode( get_bloginfo( 'name' ) ),
		'description' => html_entity_decode( get_bloginfo( 'description' ) ),
		'frontPage'   => $front_id ? get_post_field( 'post_name', $front_id ) : null,
		'menus'       => (object) $menus,
	);
}

/** Turn absolute WP URLs into frontend-relative paths so <Link> works. */
function headless_relative_url( $url ) {
	$home = untrailingslashit( home_url() );
	if ( strpos( $url, $home ) === 0 ) {
		$path = substr( $url, strlen( $home ) );
		return $path === '' ? '/' : $path;
	}
	return $url;
}

/* -------------------------------------------------------------------------
 * 3. On-demand revalidation — tell Next.js when content changes
 * ---------------------------------------------------------------------- */
function headless_send_revalidate( array $payload ) {
	$frontend = headless_frontend_url();
	if ( ! $frontend || ! defined( 'HEADLESS_REVALIDATE_SECRET' ) ) {
		return;
	}
	wp_remote_post( $frontend . '/api/revalidate', array(
		'blocking' => false,
		'timeout'  => 3,
		'headers'  => array(
			'Content-Type'        => 'application/json',
			'x-revalidate-secret' => HEADLESS_REVALIDATE_SECRET,
		),
		'body'     => wp_json_encode( $payload ),
	) );
}

function headless_revalidate_post( $post ) {
	if ( wp_is_post_revision( $post ) || wp_is_post_autosave( $post ) ) {
		return;
	}
	$type = get_post_type_object( $post->post_type );
	if ( ! $type || ! $type->show_in_rest ) {
		return;
	}
	headless_send_revalidate( array(
		'id'       => $post->ID,
		'restBase' => $type->rest_base ? $type->rest_base : $post->post_type,
		'slug'     => $post->post_name,
	) );
}

// Publish, update, unpublish, trash.
add_action( 'transition_post_status', function ( $new_status, $old_status, $post ) {
	if ( 'publish' === $new_status || 'publish' === $old_status ) {
		headless_revalidate_post( $post );
	}
}, 10, 3 );

// ACF saves fields after the post itself — revalidate once more so the new field values are picked up.
add_action( 'acf/save_post', function ( $post_id ) {
	if ( is_numeric( $post_id ) ) {
		$post = get_post( (int) $post_id );
		if ( $post && 'publish' === $post->post_status ) {
			headless_revalidate_post( $post );
		}
	}
}, 20 );

// Menus and site settings live under the "settings" tag in Next.js.
$headless_settings_hook = function () {
	headless_send_revalidate( array( 'tags' => array( 'settings' ) ) );
};
add_action( 'wp_update_nav_menu', $headless_settings_hook );
add_action( 'update_option_blogname', $headless_settings_hook );
add_action( 'update_option_blogdescription', $headless_settings_hook );
add_action( 'update_option_page_on_front', $headless_settings_hook );

/* -------------------------------------------------------------------------
 * 4. Preview button → Next.js draft mode
 * ---------------------------------------------------------------------- */
add_filter( 'preview_post_link', function ( $link, $post ) {
	$frontend = headless_frontend_url();
	if ( ! $frontend || ! defined( 'HEADLESS_PREVIEW_SECRET' ) || ! $post ) {
		return $link;
	}
	$type = get_post_type_object( $post->post_type );
	return add_query_arg( array(
		'secret' => rawurlencode( HEADLESS_PREVIEW_SECRET ),
		'id'     => $post->ID,
		'type'   => $type && $type->rest_base ? $type->rest_base : $post->post_type,
	), $frontend . '/api/preview' );
}, 10, 2 );

/* -------------------------------------------------------------------------
 * 5. "View post" links in the admin and REST `link` fields point to the frontend
 * ---------------------------------------------------------------------- */
foreach ( array( 'post_link', 'page_link', 'post_type_link' ) as $headless_filter ) {
	add_filter( $headless_filter, function ( $url ) {
		$frontend = headless_frontend_url();
		if ( $frontend && ( is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) ) {
			return str_replace( untrailingslashit( home_url() ), $frontend, $url );
		}
		return $url;
	}, 99 );
}

/* -------------------------------------------------------------------------
 * 6. Optional: redirect public theme requests to the frontend
 * ---------------------------------------------------------------------- */
add_action( 'template_redirect', function () {
	if ( ! defined( 'HEADLESS_REDIRECT_FRONTEND' ) || ! HEADLESS_REDIRECT_FRONTEND ) {
		return;
	}
	if ( is_admin() || is_preview() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}
	$frontend = headless_frontend_url();
	if ( $frontend ) {
		$path = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/';
		wp_redirect( $frontend . $path, 301 );
		exit;
	}
} );
