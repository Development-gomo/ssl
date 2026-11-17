// src/components/ui/CtaButton.jsx
// Shared CTA pill. Variants: primary (default), dark, outline-dark, outline-light.
// Renders a <button> when no href is given (e.g. form submit), a plain <a> for
// external / new-tab links and a next/link <Link> for site paths.

import Link from "next/link";

const VARIANTS = {
  primary: "bg-(--color-accent) text-white hover:bg-(--color-accent-dark) px-[34px] py-4",
  dark: "bg-(--color-dark) text-white hover:bg-(--color-accent) px-[34px] py-4",
  "outline-dark": "border-2 border-(--color-dark) text-(--color-dark) hover:bg-(--color-dark) hover:text-white px-[32px] py-[14px]",
  "outline-light": "border-2 border-white text-white hover:bg-white hover:text-(--color-dark) px-[32px] py-[14px]",
};

const isExternal = (href) => /^(https?:)?\/\//.test(href) || /^(mailto|tel):/.test(href);

export default function CtaButton({ href, children, className = "", onClick, target, variant = "primary", type = "button", ...rest }) {
  const classes = `inline-flex items-center justify-center select-none cursor-pointer rounded-full
    text-[17px] leading-[22px] font-semibold whitespace-nowrap transition-colors duration-300 ease-out
    ${VARIANTS[variant] || VARIANTS.primary} ${className}`;

  if (!href) {
    return (
      <button type={type} onClick={onClick} className={classes} {...rest}>
        {children}
      </button>
    );
  }

  if (isExternal(href) || target === "_blank") {
    return (
      <a href={href} target={target || undefined} rel={target === "_blank" ? "noopener noreferrer" : undefined} onClick={onClick} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={classes} {...rest}>
      {children}
    </Link>
  );
}
