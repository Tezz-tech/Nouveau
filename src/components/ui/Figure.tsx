import clsx from "clsx";

/** Applies the site's consistent photo grade — slight desaturation, shadows
 *  cooled toward navy — so the image set reads as commissioned, not collected. */
export default function Figure({
  src,
  alt,
  className,
  imgClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={clsx("relative", className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={clsx(
          "h-full w-full object-cover [filter:saturate(0.86)_contrast(1.03)]",
          imgClassName
        )}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-navy-deep opacity-[0.1] mix-blend-multiply"
        aria-hidden="true"
      />
    </div>
  );
}
