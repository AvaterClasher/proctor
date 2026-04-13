"use client";

import { Button } from "@proctor/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@proctor/ui/components/card";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InterviewComplete() {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-lg items-center justify-center px-4 py-16">
      <Card className="w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
            <CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-lg">
            Thank you for completing your interview!
          </CardTitle>
          <CardDescription>
            Your responses have been recorded and will be reviewed by our team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            You will hear from us within 3-5 business days. We appreciate your
            time and interest in joining Cuemath as a tutor.
          </p>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => router.push("/dashboard")}
          >
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
