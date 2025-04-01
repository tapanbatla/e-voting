import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>About Our Online Voting System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="mb-4">
                Our Online Voting System ensures a secure, transparent, and fair election process. Voters can cast their
                votes electronically, reducing manual errors and ensuring accuracy.
              </p>
              <p>
                Built with the latest security features, the system prevents fraud and guarantees the integrity of
                elections. Join us in making voting easier and accessible for everyone!
              </p>
            </div>
            <div className="flex justify-center items-center">
            <img
  src="/eVote-for-Free-1.png"
  alt="Ballot Box"
  className="rounded-lg max-w-full h-auto"
/>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="mb-4">
            In today's increasingly digital world, our online voting system offers a secure, efficient, and accessible
            alternative to traditional polling methods. We understand the importance of fair and transparent elections,
            and our platform is designed with the highest security standards to ensure the integrity of every vote.
          </p>
          <p className="mb-4">
            Voters can conveniently cast their ballots from the comfort of their homes or any location with internet
            access, eliminating the need to travel to physical polling stations and increasing voter turnout. Our system
            is user-friendly and intuitive, guiding voters through the process with ease.
          </p>
          <p>
            For election administrators, our platform provides a comprehensive suite of tools to manage all aspects of
            the election, from candidate registration and ballot creation to real-time results monitoring and detailed
            reporting.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-[#34495e] text-white">
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold mb-4">Team:</h2>
          <div className="space-y-2">
            <h3>23BDS1076 : PATEL KAVYA VIPULKUMAR</h3>
            <h3>23BDS1151 : TAPAN BATLA</h3>
            <h3>23BDS1160 : ANOK ANIL THOMAS</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}