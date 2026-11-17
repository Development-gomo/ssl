<?php
/**
 * Plugin Name: Headless Bridge (Next.js)
 * Description: Connects WordPress to a Next.js frontend: settings/menu endpoint, WPML languages and translations, on-demand revalidation, draft previews, frontend redirects and an example CPT.
 * Version:     1.2.0
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

/**
 * Late re-authentication: if another plugin (or a host mu-plugin) resolved the
 * current user before this plugin loaded, WordPress never saw the credentials
 * set above. Validate the Application Password again once the REST request
 * is known, so permission checks see the right user.
 */
add_action( 'rest_api_init', function () {
	if ( is_user_logged_in() || empty( $_SERVER['PHP_AUTH_USER'] ) || ! function_exists( 'wp_authenticate_application_password' ) ) {
		return;
	}
	$user = wp_authenticate_application_password( null, $_SERVER['PHP_AUTH_USER'], isset( $_SERVER['PHP_AUTH_PW'] ) ? $_SERVER['PHP_AUTH_PW'] : '' );
	if ( $user instanceof WP_User ) {
		wp_set_current_user( $user->ID );
	} elseif ( is_wp_error( $user ) ) {
		$GLOBALS['headless_late_auth_error'] = $user->get_error_code();
	}
}, 0 );

function headless_frontend_url() {
	return defined( 'HEADLESS_FRONTEND_URL' ) ? untrailingslashit( HEADLESS_FRONTEND_URL ) : '';
}

/**
 * WordPress site URL without the WPML language directory.
 * WPML filters home_url() per language (…/ssl/en), so it can't be used to strip the host.
 */
function headless_wp_url() {
	return untrailingslashit( get_option( 'siteurl' ) );
}

/* -------------------------------------------------------------------------
 * WPML helpers — every function also works without WPML (single language).
 * ---------------------------------------------------------------------- */
function headless_has_wpml() {
	return defined( 'ICL_SITEPRESS_VERSION' );
}

/** Run $callback with WPML switched to $lang (no-op without WPML or $lang). */
function headless_in_language( $lang, $callback ) {
	if ( ! headless_has_wpml() || ! $lang ) {
		return $callback();
	}
	$previous = apply_filters( 'wpml_current_language', null );
	do_action( 'wpml_switch_language', $lang );
	$result = $callback();
	do_action( 'wpml_switch_language', $previous );
	return $result;
}

/** Language code of a post ("sv", "en"), or null without WPML. */
function headless_post_lang( $post_id ) {
	if ( ! headless_has_wpml() ) {
		return null;
	}
	$details = apply_filters( 'wpml_post_language_details', null, $post_id );
	return is_array( $details ) && ! empty( $details['language_code'] ) ? $details['language_code'] : null;
}

/**
 * Published translations of a post, keyed by language:
 * { "sv": { "id": 2, "slug": "exempelsida", "uri": "exempelsida" }, "en": { … } }
 * (uri only for pages — the full path including parents).
 */
function headless_post_translations( $post_id, $post_type ) {
	if ( ! headless_has_wpml() ) {
		return (object) array();
	}
	$element_type = 'post_' . $post_type;
	$trid         = apply_filters( 'wpml_element_trid', null, $post_id, $element_type );
	if ( ! $trid ) {
		return (object) array();
	}
	$translations = apply_filters( 'wpml_get_element_translations', null, $trid, $element_type );
	$out          = array();
	foreach ( (array) $translations as $code => $translation ) {
		$id = isset( $translation->element_id ) ? (int) $translation->element_id : 0;
		if ( ! $id || 'publish' !== get_post_status( $id ) ) {
			continue;
		}
		$out[ $code ] = array(
			'id'   => $id,
			'slug' => get_post_field( 'post_name', $id ),
			'uri'  => 'page' === $post_type ? get_page_uri( $id ) : null,
		);
	}
	return (object) $out;
}

/** Active languages: [ { code, name, default } ], or [] without WPML. */
function headless_languages() {
	if ( ! headless_has_wpml() ) {
		return array();
	}
	$default = apply_filters( 'wpml_default_language', null );
	$active  = apply_filters( 'wpml_active_languages', null, array( 'skip_missing' => 0 ) );
	$out     = array();
	foreach ( (array) $active as $code => $language ) {
		$out[] = array(
			'code'    => $code,
			'name'    => isset( $language['native_name'] ) ? $language['native_name'] : $code,
			'default' => $code === $default,
		);
	}
	return $out;
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
 * 2. /wp-json/headless/v1/settings?lang=en — site info, front page and menus
 *    for one language (core's menu endpoints require authentication, this one
 *    is public). Without ?lang the WPML default language is used.
 * ---------------------------------------------------------------------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'headless/v1', '/settings', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => 'headless_settings_endpoint',
		'args'                => array(
			'lang' => array( 'type' => 'string', 'sanitize_callback' => 'sanitize_key' ),
		),
	) );

	// Page path (e.g. "about/team") so Next.js can resolve nested pages.
	register_rest_field( 'page', 'uri', array(
		'get_callback' => function ( $post ) {
			return get_page_uri( $post['id'] );
		},
		'schema'       => array( 'type' => 'string' ),
	) );

	// WPML: language + published translations on every public post type.
	$skip = array( 'attachment', 'nav_menu_item', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_global_styles', 'wp_font_family', 'wp_font_face' );
	foreach ( get_post_types( array( 'show_in_rest' => true ) ) as $post_type ) {
		if ( in_array( $post_type, $skip, true ) ) {
			continue;
		}
		register_rest_field( $post_type, 'lang', array(
			'get_callback' => function ( $post ) {
				return headless_post_lang( $post['id'] );
			},
			'schema'       => array( 'type' => array( 'string', 'null' ) ),
		) );
		register_rest_field( $post_type, 'translations', array(
			'get_callback' => function ( $post ) {
				return headless_post_translations( $post['id'], get_post_type( $post['id'] ) );
			},
			'schema'       => array( 'type' => 'object' ),
		) );
	}
} );

function headless_settings_endpoint( WP_REST_Request $request ) {
	$lang = $request->get_param( 'lang' );

	return headless_in_language( $lang, function () {
		$front_id = (int) get_option( 'page_on_front' ); // WPML returns the translated front page
		$menus    = array();

		foreach ( get_nav_menu_locations() as $location => $menu_id ) { // WPML maps to this language's menu
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
			'lang'        => headless_has_wpml() ? apply_filters( 'wpml_current_language', null ) : null,
			'languages'   => headless_languages(),
			'frontPage'   => $front_id ? get_post_field( 'post_name', $front_id ) : null,
			'menus'       => (object) $menus,
		);
	} );
}

/**
 * Turn absolute WP or frontend URLs into site-relative paths so <Link> works.
 * The WPML language directory is kept: https://…/ssl/en/about/ → /en/about/
 */
function headless_relative_url( $url ) {
	foreach ( array( headless_wp_url(), headless_frontend_url() ) as $origin ) {
		if ( $origin && strpos( $url, $origin ) === 0 ) {
			$path = substr( $url, strlen( $origin ) );
			return $path === '' ? '/' : $path;
		}
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
		'id'           => $post->ID,
		'restBase'     => $type->rest_base ? $type->rest_base : $post->post_type,
		'slug'         => $post->post_name,
		'lang'         => headless_post_lang( $post->ID ),
		// the other languages' pages link to this one (language switcher, hreflang)
		'translations' => headless_post_translations( $post->ID, $post->post_type ),
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
			// siteurl, not home_url(): WPML adds /en to home_url(), and the language
			// directory must stay in the result (…/ssl/en/about/ → https://frontend/en/about/)
			return str_replace( headless_wp_url(), $frontend, $url );
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
