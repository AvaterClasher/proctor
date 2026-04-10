"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@proctor/ui/components/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@proctor/ui/components/card";

export default function Dashboard({ session }: { session: typeof authClient.$Infer.Session }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Interview</CardTitle>
        <CardDescription>Cuemath tutor screening status</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground">
          You haven&apos;t started your screening interview yet.
        </p>
        <Button className="self-start" render={<Link href="/interview" />}>
          Start Interview
        </Button>
      </CardContent>
    </Card>
  );
}
