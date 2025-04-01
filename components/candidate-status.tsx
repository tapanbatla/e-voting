"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { OTPVerification } from "./otp-verification"

export function CandidateStatus() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [candidateData, setCandidateData] = useState<any>(null)
  const [searchData, setSearchData] = useState({
    email: searchParams.get("email") || "",
    candidateId: searchParams.get("id") || "",
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get("email") && searchParams.get("id")) {
      handleSearch()
    }
  }, [])

  const handleSearch = async () => {
    if (!searchData.email || !searchData.candidateId) {
      setError("Please enter both email and candidate ID")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("email", searchData.email)
        .eq("candidate_id", searchData.candidateId)
        .single()

      if (error) throw error

      if (!data) {
        throw new Error("No application found with the provided details")
      }

      setCandidateData(data)
      setIsVerified(data.email_verified)

      // If not verified and coming from application submission, show OTP modal
      if (!data.email_verified && searchParams.get("email") && searchParams.get("id")) {
        setShowOTPModal(true)
      }
    } catch (err: any) {
      console.error("Error searching for application:", err)
      setError(err.message || "Failed to find application")
      setCandidateData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const sendVerificationOTP = async () => {
    try {
      // Send OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: searchData.email,
      })

      if (otpError) throw otpError

      setShowOTPModal(true)
      toast({
        title: "Verification Code Sent",
        description: "Please check your email for the verification code",
      })
    } catch (err: any) {
      console.error("Error sending verification code:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to send verification code",
      })
    }
  }

  const handleVerifyOTP = async (otp: string) => {
    try {
      // Verify OTP
      const { error } = await supabase.auth.verifyOtp({
        email: searchData.email,
        token: otp,
        type: "email",
      })

      if (error) throw error

      // Update candidate as verified
      const { error: updateError } = await supabase
        .from("candidates")
        .update({ email_verified: true })
        .eq("id", candidateData.id)

      if (updateError) throw updateError

      setShowOTPModal(false)
      setIsVerified(true)

      // Refresh candidate data
      const { data } = await supabase.from("candidates").select("*").eq("id", candidateData.id).single()

      if (data) {
        setCandidateData(data)
      }

      toast({
        title: "Email Verified",
        description: "Your email has been successfully verified",
      })
    } catch (err: any) {
      console.error("Error verifying OTP:", err)
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: err.message || "Failed to verify code",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "success"
      case "rejected":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Application Status</CardTitle>
        <CardDescription>Check the status of your candidate application</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!candidateData ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={searchData.email}
                onChange={(e) => setSearchData({ ...searchData, email: e.target.value })}
                placeholder="Enter the email you used in your application"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidateId">Candidate ID</Label>
              <Input
                id="candidateId"
                value={searchData.candidateId}
                onChange={(e) => setSearchData({ ...searchData, candidateId: e.target.value })}
                placeholder="Enter your candidate ID"
              />
            </div>
            <Button onClick={handleSearch} className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Check Status"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">{candidateData.name}</h2>
              <div className="flex space-x-2">
                {isVerified ? (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Unverified
                  </Badge>
                )}
                <Badge variant={getStatusColor(candidateData.status) as any}>
                  {candidateData.status.charAt(0).toUpperCase() + candidateData.status.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Candidate ID</p>
                  <p className="font-medium">{candidateData.candidate_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{candidateData.email}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{candidateData.description || "No description provided"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Application Date</p>
                <p className="font-medium">{new Date(candidateData.created_at).toLocaleDateString()}</p>
              </div>

              {!isVerified && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                  <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span>
                      Your email is not verified. You need to verify your email before your application can be reviewed.
                    </span>
                    <Button
                      onClick={sendVerificationOTP}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 mt-2 sm:mt-0"
                    >
                      Verify Now
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {candidateData.status === "rejected" && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Your application has been rejected. Please contact the election administrator for more information.
                  </AlertDescription>
                </Alert>
              )}

              {candidateData.status === "approved" && (
                <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
                  <AlertDescription>
                    Congratulations! Your application has been approved. You are now a candidate in the election.
                  </AlertDescription>
                </Alert>
              )}

              {candidateData.status === "pending" && isVerified && (
                <Alert>
                  <AlertDescription>
                    Your application is currently under review by the administrators. You will be notified once a
                    decision has been made.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-6">
        <Button variant="outline" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </CardFooter>

      {showOTPModal && (
        <OTPVerification
          onVerify={handleVerifyOTP}
          onCancel={() => setShowOTPModal(false)}
          email={searchData.email}
          mode="verification"
        />
      )}
    </Card>
  )
}

