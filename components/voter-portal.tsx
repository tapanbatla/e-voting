"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { OTPVerification } from "./otp-verification"; // Assuming this component exists
import { supabase } from "@/lib/supabase"; // Assuming supabase client is configured

export function VoterPortal() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(true); // Initial state should be true if fetching on login
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [selectedCandidateName, setSelectedCandidateName] = useState<string | null>(null);
  const [voterData, setVoterData] = useState({
    name: "",
    voterId: "",
    email: "",
  });
  const [candidates, setCandidates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    let wasNewVoter = false; // Flag to track implicit registration

    try {
      // Validate form
      if (!voterData.email || !voterData.voterId || !voterData.name) {
        throw new Error("Please fill in all required fields");
      }

      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(voterData.email)) {
        throw new Error("Please enter a valid email address");
      }

      // Check if voter exists
      const { data: voters, error: voterError } = await supabase
        .from('voters')
        .select('*')
        .eq('voter_id', voterData.voterId);

      if (voterError) throw voterError;

      let currentVoterData = null;

      // If voter doesn't exist, create a new record (implicit registration)
      if (!voters || voters.length === 0) {
        wasNewVoter = true; // Mark as new voter
        const { data: insertedData, error: insertError } = await supabase.from('voters').insert([
          {
            name: voterData.name,
            voter_id: voterData.voterId,
            email: voterData.email,
            has_voted: false
          }
        ]).select().single(); // Select the inserted data

        if (insertError) throw insertError;
        currentVoterData = insertedData; // Store the newly created voter data

        // We need to set the state with potentially db-generated fields if any
        // In this case, we are just confirming the data entered is now in the DB.
        setVoterData({
          name: currentVoterData.name,
          voterId: currentVoterData.voter_id,
          email: currentVoterData.email,
        });

      } else {
        // Voter exists
        currentVoterData = voters[0];

        // Check if voter has already voted
        if (currentVoterData.has_voted) {
          throw new Error("You have already voted in this election");
        }

        // Update existing voter record with the current information if needed
        // (e.g., if they updated their name or email on the login form)
        if (currentVoterData.name !== voterData.name || currentVoterData.email !== voterData.email) {
          const { error: updateError } = await supabase
            .from('voters')
            .update({
              name: voterData.name,
              email: voterData.email
            })
            .eq('voter_id', voterData.voterId);
          if (updateError) throw updateError;
          // Update local state to reflect the submitted data
          setVoterData({
            name: voterData.name,
            voterId: voterData.voterId, // Keep the ID they logged in with
            email: voterData.email,
          });
        } else {
          // If no update needed, still set state from the fetched data
          setVoterData({
            name: currentVoterData.name,
            voterId: currentVoterData.voter_id,
            email: currentVoterData.email,
          });
        }
      }

      // If we reached here, login/registration was successful (and they haven't voted)
      setIsLoggedIn(true);
      setHasVoted(false); // Ensure hasVoted state is reset on login
      fetchCandidates(); // Fetch candidates after successful login/registration

      // Show appropriate toast message
      toast({
        title: wasNewVoter ? "Registration Successful" : "Login Successful",
        description: wasNewVoter
          ? "Your details have been registered. You can now vote."
          : "You can now vote for a candidate.",
      });

    } catch (err: any) {
      console.error("Error during access:", err);
      setError(err.message || "An error occurred");
      setIsLoggedIn(false); // Ensure not logged in if error occurs
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCandidates = async () => {
    setLoadingCandidates(true);
    try {
      // Fetch candidates that are both approved and email verified
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('status', 'approve')
        .eq('email_verified', true);

      if (candidateError) throw candidateError;

      if (!candidateData || candidateData.length === 0) {
        toast({
          variant: "destructive",
          title: "No candidates available",
          description: "There are no approved candidates available for voting at this time."
        });
      }

      setCandidates(candidateData || []);
    } catch (err: any) {
      console.error("Error fetching candidates:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load candidates"
      });
      setCandidates([]); // Ensure candidates list is empty on error
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleCandidateSelect = (candidateId: string) => {
    if (hasVoted) return; // Prevent changing selection after voting
    const candidate = candidates.find(c => c.id === candidateId);
    if (candidate) {
      setSelectedCandidate(candidateId);
      setSelectedCandidateName(candidate.name);
    }
  };

  const initiateVote = async () => {
    if (!selectedCandidate) {
      toast({
        variant: "destructive",
        title: "No candidate selected",
        description: "Please select a candidate to vote for"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check again if voter has voted *just before* initiating the vote.
      const { data: voterCheck, error: checkError } = await supabase
        .from('voters')
        .select('has_voted')
        .eq('voter_id', voterData.voterId)
        .single();

      if (checkError) throw new Error("Could not verify voter status before initiating vote.");
      if (voterCheck?.has_voted) {
        throw new Error("Vote already recorded for this voter.");
      }

      // Send OTP via Supabase Auth
      const { error } = await supabase.auth.signInWithOtp({
        email: voterData.email,
        options: {
          // Optional: Link OTP to the current session without creating a Supabase user session
          // shouldCreateUser: false, // Might be useful depending on full auth flow
        }
      });

      if (error) throw error;

      setShowOTPModal(true);
      toast({
        title: "Verification Code Sent",
        description: "Please check your email for the verification code",
      });
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      toast({
        variant: "destructive",
        title: "Error Sending Code",
        description: err.message || "Failed to send verification code",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    if (!selectedCandidate) return; // Should not happen if modal is shown, but safety check

    // Add loading state specifically for OTP verification if desired
    // setOtpVerifying(true);

    try {
      // Verify OTP
      // Note: If using `signInWithOtp` with `shouldCreateUser: false`,
      // verifyOtp might behave differently or require specific setup.
      // Assuming standard email OTP verification flow here.
      const { data: { session }, error: otpError } = await supabase.auth.verifyOtp({
        email: voterData.email,
        token: otp,
        type: 'email', // Use 'email' type explicitly
      });

      if (otpError) throw otpError;

      // --- Vote Recording Logic ---
      // Check again if voter has voted *just before* recording the vote (race condition prevention)
      const { data: voterCheck, error: checkError } = await supabase
        .from('voters')
        .select('has_voted')
        .eq('voter_id', voterData.voterId)
        .single();

      if (checkError) throw new Error("Could not verify voter status before recording vote.");
      if (voterCheck?.has_voted) {
        throw new Error("Vote already recorded for this voter.");
      }

      // Use a transaction to record vote and update status together
      const { error: transactionError } = await supabase.rpc('record_vote', {
        voter_id_param: voterData.voterId,
        candidate_id_param: selectedCandidate
      });

      if (transactionError) {
        // Handle specific errors if needed (e.g., unique constraint violation)
        console.error("Transaction error:", transactionError);
        if (transactionError.message.includes('already voted')) { // Example check
          throw new Error("It seems you have already voted.");
        }
        throw new Error(`Failed to record vote: ${transactionError.message}`);
      }

      // --- End Vote Recording Logic ---

      setShowOTPModal(false);
      setHasVoted(true); // Update UI state immediately

      toast({
        title: "Vote Recorded Successfully",
        description: `Your vote for ${selectedCandidateName} has been recorded. Thank you!`,
      });

      // Optional: Sign out the temporary Supabase Auth session if one was created
      // await supabase.auth.signOut();

    } catch (err: any) {
      console.error("Error verifying OTP or recording vote:", err);
      toast({
        variant: "destructive",
        title: "Vote Recording Failed",
        description: err.message || "Failed to verify code or record vote. Please try again.",
      });
      // Keep OTP modal open for retry? Or close it?
      // setShowOTPModal(false); // Decide on desired UX
    } finally {
      // setOtpVerifying(false);
    }
  };

  // ================= RENDER LOGIC =================

  if (!isLoggedIn) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          {/* *** MODIFIED UI TEXT *** */}
          <CardTitle>Voter Access</CardTitle>
          <CardDescription>Enter your details to access the voting portal. If your Voter ID isn't registered yet, it will be added.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={voterData.name}
                  onChange={(e) => setVoterData({ ...voterData, name: e.target.value })}
                  required
                  placeholder="Enter your full name"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voterId">Voter ID</Label>
                <Input
                  id="voterId"
                  value={voterData.voterId}
                  onChange={(e) => setVoterData({ ...voterData, voterId: e.target.value })}
                  required
                  placeholder="Enter your voter ID"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={voterData.email}
                  onChange={(e) => setVoterData({ ...voterData, email: e.target.value })}
                  required
                  placeholder="Enter your email for verification"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">We'll send a verification code to this email when you submit your vote.</p>
              </div>
            </div>
            {/* *** MODIFIED BUTTON TEXT *** */}
            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Access Voting Portal" // <-- Changed text
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Logged In View
  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cast Your Vote</CardTitle>
          {/* Display fetched/confirmed voter data */}
          <CardDescription>
            Welcome, <span className="font-medium">{voterData.name}</span> (Voter ID: <span className="font-medium">{voterData.voterId}</span>)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasVoted && (
            <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
              <AlertDescription>
                You have successfully voted for <span className="font-medium">{selectedCandidateName || "your chosen candidate"}</span>. Thank you for participating!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold mb-4">Available Candidates</h2>

      {loadingCandidates ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading Candidates...</span>
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">No candidates are available for voting at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            {!hasVoted ? (
              <div className="space-y-6">
                <RadioGroup
                  value={selectedCandidate || ""}
                  onValueChange={handleCandidateSelect}
                  className="space-y-4"
                  disabled={hasVoted || isSubmitting} // Disable radio group after voting or while submitting OTP request
                >
                  {candidates.map((candidate) => (
                    <div key={candidate.id} className={`flex items-start space-x-3 p-3 rounded-md border transition-colors ${hasVoted ? 'opacity-70 cursor-not-allowed' : 'hover:bg-muted/50'}`}>
                      <RadioGroupItem value={candidate.id} id={`candidate-${candidate.id}`} className="mt-1" disabled={hasVoted || isSubmitting} />
                      <div className="grid gap-1.5 w-full">
                        <Label htmlFor={`candidate-${candidate.id}`} className={`text-lg font-medium ${hasVoted ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          {candidate.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">ID: {candidate.candidate_id}</p>
                        {candidate.description && (
                          <p className="text-sm mt-1">{candidate.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={initiateVote}
                    className="bg-primary hover:bg-primary/90" // Use primary color for main action
                    disabled={!selectedCandidate || isSubmitting || hasVoted}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      "Submit Vote"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // Displayed after voting successfully (redundant with the top alert, but can be kept for structure)
              <div className="text-center py-4">
                <p className="text-lg font-medium text-green-700">Your vote has been recorded.</p>
                <p className="text-muted-foreground">Thank you for participating in this election!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* OTP Modal */}
      {showOTPModal && (
        <OTPVerification
          onVerify={handleVerifyOTP}
          onCancel={() => {
            setShowOTPModal(false);
            // Consider if isSubmitting needs reset if cancelled here
            // setIsSubmitting(false); // May not be needed depending on flow
          }}
          email={voterData.email}
          mode="voting" // Pass mode if your OTP component uses it
        />
      )}
    </div>
  );
}