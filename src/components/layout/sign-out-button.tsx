'use client'

import { signOutAction } from '@/actions/auth/signOut'

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-gray-300 hover:bg-white/5 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
      >
        Sign out
      </button>
    </form>
  )
}


