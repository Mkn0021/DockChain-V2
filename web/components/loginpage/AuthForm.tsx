"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";

import { Button } from "@/components/_ui/Button";
import InputBox from "@/components/_ui/InputBox";
import { useAlert } from "@/components/providers/AlertProvider";
import ApiClient from "@/lib/api-client";
import { FormData, User } from "@/types/auth.type";

const AuthForm: React.FC = () => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [mode, setMode] = useState<"login" | "signup" | "setPassword" | "otp">(
    "login"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [mode]);

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Signup - Step 1: Name and Email
    if (mode === "signup") {
      if (!formData.name.trim()) {
        setError("Please enter your name");
        return;
      }
      if (!formData.email.trim()) {
        setError("Please enter your email");
        return;
      }
      // Move to Set Password step
      setMode("setPassword");
    }

    // Signup - Step 2: Set Password
    else if (mode === "setPassword") {
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      setLoading(true);
      try {
        const res = await ApiClient.post("/auth/register", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });

        if (!res.success) {
          setError(res.error || "Registration failed. Please try again.");
          return;
        }

        showAlert(
          "Registration successful! Please verify your email.",
          "success"
        );
        // Move to OTP verification
        setMode("otp");
        setSuccess("");
      } catch (err) {
        setError("An unexpected error occurred. Please try again.");
        showAlert(`Registration failed: ${err}`, "error");
      } finally {
        setLoading(false);
      }
    }

    // Signup - Step 3: OTP Verification
    else if (mode === "otp") {
      if (formData.otp.length !== 6) {
        setError("Please enter a valid 6-digit OTP");
        return;
      }

      setLoading(true);
      try {
        const res = await ApiClient.post("/auth/verify", {
          email: formData.email,
          otp: formData.otp,
        });

        if (!res.success) {
          setError(res.error || "Invalid OTP. Please try again.");
          return;
        }

        showAlert(
          "Email verified successfully! You can now log in.",
          "success"
        );
        setMode("login");
        updateFormData("otp", "");
        setSuccess("");
      } catch (err) {
        setError("An unexpected error occurred. Please try again.");
        showAlert(`OTP verification failed: ${err}`, "error");
      } finally {
        setLoading(false);
      }
    }

    // Login
    else if (mode === "login") {
      if (!formData.email.trim()) {
        setError("Please enter your email");
        return;
      }
      if (!formData.password.trim()) {
        setError("Please enter your password");
        return;
      }

      setLoading(true);
      try {
        const res = await ApiClient.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });

        if (!res.success) {
          setError(res.error || "Login failed. Please check your credentials.");
          return;
        }

        const userData = res.data as User;

        localStorage.setItem(
          "user",
          JSON.stringify({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            isVerified: userData.isVerified,
          })
        );

        // TODO: Switch to Server-side

        showAlert("Login successful! Redirecting to dashboard...", "success");
        router.push("/dashboard");
      } catch (err) {
        setError("An unexpected error occurred. Please try again.");
        showAlert(`Login failed: ${err}`, "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      setError("Please enter your email address first");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await ApiClient.post("/auth/forgot-password", {
        email: formData.email,
      });

      // TODO: Implement forgot password flow

      if (!res.success) {
        setError(res.error || "Failed to send reset OTP.");
        return;
      }

      showAlert("Password reset OTP sent to your email.", "success");
      setSuccess("");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      showAlert(`Failed to send reset OTP: ${err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth login functionality
    showAlert("Google login is not implemented yet", "info");
  };

  const handleResendOTP = async () => {
    // TODO: Implement resend OTP functionality
    showAlert("Resend OTP is not implemented yet", "info");
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {mode === "otp"
            ? "Verify Email"
            : mode === "setPassword"
              ? "Set Password"
              : mode === "login"
                ? "Welcome Back"
                : "Create Account"}
        </h1>
        <p className="text-gray-600">
          {mode === "otp"
            ? "Enter the OTP sent to your email"
            : mode === "setPassword"
              ? "Create a secure password for your account"
              : mode === "login"
                ? "Sign in to continue"
                : "Sign up to get started"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            {success}
          </div>
        )}

        {/* OTP Verification Step */}
        {mode === "otp" ? (
          <>
            <InputBox
              label="OTP Code"
              type="text"
              placeholder="Enter 6-digit code"
              value={formData.otp}
              onChange={(e) =>
                updateFormData("otp", e.target.value.replace(/\D/g, ""))
              }
              maxLength={6}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={loading}
              className="w-full text-center text-sm text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Resend OTP"}
            </button>
          </>
        ) : mode === "setPassword" ? (
          <>
            <InputBox
              label="Password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => updateFormData("password", e.target.value)}
              disabled={loading}
            />
            <InputBox
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) =>
                updateFormData("confirmPassword", e.target.value)
              }
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Complete Signup"}
            </Button>
          </>
        ) : (
          <>
            {mode === "signup" && (
              <InputBox
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                disabled={loading}
              />
            )}

            <InputBox
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => updateFormData("email", e.target.value)}
              disabled={loading}
            />

            {mode === "login" && (
              <>
                <InputBox
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  disabled={loading}
                />

                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Forgot Password?
                  </button>
                </div>
              </>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? mode === "login"
                  ? "Signing In..."
                  : "Processing..."
                : mode === "login"
                  ? "Sign In"
                  : "Continue"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-150"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </>
        )}
      </form>

      {mode !== "otp" && mode !== "setPassword" && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-blue-600 font-medium hover:underline"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      )}

      {mode === "otp" && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setMode("signup")}
            className="text-sm text-gray-600 hover:underline"
          >
            ← Back to Sign Up
          </button>
        </div>
      )}

      {mode === "setPassword" && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setMode("otp")}
            className="text-sm text-gray-600 hover:underline"
          >
            ← Change Email Address
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthForm;
