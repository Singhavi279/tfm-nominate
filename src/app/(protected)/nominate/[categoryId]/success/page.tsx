import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SubmissionSuccessPage() {
    return (
        <div className="container flex items-center justify-center py-20">
            <Card className="max-w-lg text-center">
                <CardHeader>
                    <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full p-3 w-fit">
                        <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="mt-4 text-2xl font-headline">Submission Successful!</CardTitle>
                    <CardDescription>
                        Thank you for your nomination. Your submission has been received and will be reviewed by our committee.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/dashboard">
                            Return to Dashboard
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
