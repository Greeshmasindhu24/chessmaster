import { Link } from 'react-router-dom'
import { mainNavLinks } from '../config/navLinks'

export default function HeaderNavLinks() {
  return (
    <>
      {mainNavLinks.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          {link.label}
        </Link>
      ))}
    </>
  )
}
