"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";

export function AuthPage({ isSignin }: { isSignin: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignin) {
        // Sign in
        const response = await authAPI.signin({
          username: email,
          password: password,
        });

        // Store tokens and user data
        localStorage.setItem("accessToken", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);
        localStorage.setItem("user", JSON.stringify(response.user));

        // Redirect to canvas or rooms page
        router.push("/canvas");
      } else {
        // Sign up
        const response = await authAPI.signup({
          username: email,
          password: password,
          name: name,
        });

        // Store tokens and user data
        localStorage.setItem("accessToken", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);
        localStorage.setItem("user", JSON.stringify(response.user));

        // Redirect to canvas or rooms page
        router.push("/canvas");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(
        err.response?.data?.message || 
        err.message || 
        "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {isSignin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isSignin
              ? "Sign in to continue to your canvas"
              : "Sign up to start collaborating"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isSignin && (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isSignin}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
            {!isSignin && (
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 6 characters
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-base font-medium"
          >
            {loading
              ? "Please wait..."
              : isSignin
              ? "Sign In"
              : "Create Account"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-600">
            {isSignin ? "Don't have an account?" : "Already have an account?"}
          </span>{" "}
          <a
            href={isSignin ? "/signup" : "/signin"}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {isSignin ? "Sign up" : "Sign in"}
          </a>
        </div>
      </Card>
    </div>
  );
}
