import { auth } from '@/lib/auth'
import Link from 'next/link'
import { SignOutButton } from './sign-out-button'

export default async function NavBar() {
  const session = await auth()
  
  return (
    <nav className="relative bg-gray-800 dark:bg-gray-800/50 dark:after:pointer-events-none dark:after:absolute dark:after:inset-x-0 dark:after:bottom-0 dark:after:h-px dark:after:bg-white/10">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <div className="ml-3">
              {session?.user ? (
                <div className="flex space-x-4">
                  <Link 
                    href="/editor" 
                    className="text-gray-300 hover:bg-white/5 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
                  >
                    Editor
                  </Link>
                  <SignOutButton />
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-gray-300 hover:bg-white/5 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
