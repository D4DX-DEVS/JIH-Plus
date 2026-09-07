import LogoColor from '../../assets/LogoColor.png'
import LogoWhite from '../../assets/LogoWhite.png'

const SIZE_CLASSES = {
  xs: 'h-7',
  sm: 'h-9',
  md: 'h-12',
  lg: 'h-16',
  xl: 'h-20',
}

/** Canonical JIH logo renderer used by every portal shell. */
export default function BrandLogo({
  variant = 'color',
  size = 'sm',
  alt = 'JIH Plus',
  className = '',
}) {
  const source = variant === 'white' ? LogoWhite : LogoColor
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm

  return (
    <img
      src={source}
      alt={alt}
      className={`${sizeClass} w-auto shrink-0 object-contain ${className}`}
    />
  )
}
