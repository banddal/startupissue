import { signInWithGoogle, signOutCurrentUser } from "@/app/actions/auth";

export function SignInButton() {
  return (
    <form action={signInWithGoogle}>
      <button
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        type="submit"
      >
        Google로 시작하기
      </button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutCurrentUser}>
      <button
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
        type="submit"
      >
        로그아웃
      </button>
    </form>
  );
}
