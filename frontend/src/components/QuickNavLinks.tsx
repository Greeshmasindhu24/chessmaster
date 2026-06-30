import { Link } from 'react-router-dom'
import { mainNavLinks } from '../config/navLinks'

interface Props {
  className?: string
}

/** Horizontal quick links matching dashboard Quick Play button row. */
export default function QuickNavLinks({ className = '' }: Props) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {mainNavLinks.map((link) => (
        <Link key={link.to} to={link.to} className="btn-secondary">
          {link.label}
        </Link>
      ))}
    </div>
  )
}
