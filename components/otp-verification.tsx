"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

interface OTPVerificationProps {
  onVerify: (otp: string) => void
  onCancel: () => void
  email: string
  mode?: "voting" | "verification"
}

export function OTPVerification({ onVerify, onCancel, email, mode = "voting" }: OTPVerificationProps) {
  const { toast } = useToast()
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""))
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes
  const [error, setError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus the first input when modal opens
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }

    // Start the timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Clean up
    return () => clearInterval(timer)
  }, [])

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus()
    }

    // If all inputs are filled, attempt verification automatically
    if (index === 5 && value && newOtp.every((digit) => digit)) {
      setTimeout(() => handleVerify(), 300)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus()
    }

    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text")

    // Filter only digits and take the first 6
    const digits = pastedData.replace(/\D/g, "").slice(0, 6).split("")

    // Fill in the OTP inputs
    const newOtp = [...otp]
    digits.forEach((digit, index) => {
      if (index < 6) {
        newOtp[index] = digit
        if (inputRefs.current[index]) {
          inputRefs.current[index]!.value = digit
        }
      }
    })

    setOtp(newOtp)

    // Focus the next empty input or the last one
    const nextEmptyIndex = newOtp.findIndex((v) => !v)
    if (nextEmptyIndex >= 0 && nextEmptyIndex < 6) {
      inputRefs.current[nextEmptyIndex]?.focus()
    } else if (digits.length > 0) {
      inputRefs.current[5]?.focus()

      // If all inputs are filled, attempt verification automatically
      if (newOtp.every((digit) => digit)) {
        setTimeout(() => handleVerify(), 300)
      }
    }
  }

  const handleVerify = async () => {
    const otpString = otp.join("")
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits of the OTP")
      return
    }

    setError(null)
    setIsVerifying(true)

    try {
      onVerify(otpString)
    } catch (err: any) {
      console.error("Error in verification:", err)
      setError(err.message || "Verification failed")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendOTP = async () => {
    if (timeLeft > 60) {
      toast({
        variant: "destructive",
        title: "Please wait",
        description: `You can request a new OTP in ${timeLeft - 60} seconds`,
      })
      return
    }

    setIsResending(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      })

      if (error) throw error

      // Reset timer
      setTimeLeft(120)

      // Clear OTP fields
      setOtp(Array(6).fill(""))
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus()
      }

      toast({
        title: "OTP Sent",
        description: "A new verification code has been sent to your email",
      })
    } catch (err: any) {
      console.error("Error resending OTP:", err)
      setError(err.message || "Failed to resend OTP")

      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to send OTP",
      })
    } finally {
      setIsResending(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md animate-in fade-in-50 slide-in-from-bottom-10 duration-300">
        <CardHeader>
          <CardTitle>{mode === "voting" ? "Verify Your Vote" : "Email Verification"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            We've sent a 6-digit code to <span className="font-medium">{email}</span>. Please enter it below to verify{" "}
            {mode === "voting" ? "your vote" : "your email"}.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between mb-6 gap-2" onPaste={handlePaste}>
            {Array(6)
              .fill(0)
              .map((_, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={otp[index]}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl"
                  disabled={isVerifying}
                  autoComplete="one-time-code"
                />
              ))}
          </div>

          <div className={`text-center font-medium ${timeLeft < 30 ? "text-red-500" : "text-muted-foreground"} mb-4`}>
            Time remaining: {formatTime(timeLeft)}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            onClick={handleVerify}
            className="w-full"
            disabled={otp.join("").length !== 6 || timeLeft === 0 || isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              `Verify & ${mode === "voting" ? "Submit Vote" : "Continue"}`
            )}
          </Button>

          <div className="text-center w-full">
            Didn't receive the code?{" "}
            <Button
              variant="link"
              onClick={handleResendOTP}
              disabled={timeLeft > 60 || isResending}
              className="p-0 h-auto"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Code"
              )}
            </Button>
          </div>

          <Button variant="outline" onClick={onCancel} className="w-full" disabled={isVerifying}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

