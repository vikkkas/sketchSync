"use client";
export function AuthPage({ isSignin }: { isSignin: boolean }) {
  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="p-2 m-2 bg-white rounded">
        <div className="p-2">
          <input className="border" placeholder="Email" type="text" />
        </div>

        <div className="p-2">
          <input className="border" type="password" placeholder="Password" />
        </div>

        <div className="pt-2 rounded bg-red-200">
          <button onClick={() => {}}>{isSignin ? "Sign in" : "Sign Up"}</button>
        </div>
      </div>
    </div>
  );
}
