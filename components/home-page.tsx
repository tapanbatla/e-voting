import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function HomePage() {
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome to Online Voting System</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-6">Cast your vote securely and conveniently from anywhere.</p>

        <div className="mb-8">
          <h3 className="text-lg font-medium mb-3">How to Vote:</h3>
          <ol className="list-decimal ml-6 space-y-2">
            <li>Go to Voter Portal</li>
            <li>Enter your name and voter ID</li>
            <li>Select your preferred candidate</li>
            <li>Verify your identity with OTP</li>
            <li>Click "Vote" to submit your choice</li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link href="/voter">Go to Voter Portal</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/results">View Current Results</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/candidate">Apply as Candidate</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

