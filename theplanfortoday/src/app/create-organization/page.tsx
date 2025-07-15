"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { Header } from "@/components/header";

const formSchema = z.object({
  organizationName: z.string().min(2, { message: "Organization name must be at least 2 characters." }),
});

export default function CreateOrganizationPage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationName: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // On successful creation, redirect to dashboard
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
             <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Create Your Organization</CardTitle>
                    <CardDescription>Let's set up your workspace in Planiverse.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="organizationName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Acme Inc." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        
                        <FormItem>
                            <FormLabel>Logo (Optional)</FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-4">
                                    <div className="relative h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                                         <Image src="https://placehold.co/128x128.png" alt="logo placeholder" width={80} height={80} className="rounded-full" data-ai-hint="logo company" />
                                    </div>
                                    <Button type="button" variant="outline">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload
                                    </Button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>

                        <FormItem>
                            <FormLabel>Theming (Coming Soon)</FormLabel>
                            <div className="flex items-center gap-4 p-4 rounded-md border border-dashed">
                               <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Customize your organization's appearance.</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full" style={{backgroundColor: 'hsl(var(--primary))'}}></div>
                                        <div className="h-6 w-6 rounded-full" style={{backgroundColor: 'hsl(var(--accent))'}}></div>
                                        <div className="h-6 w-6 rounded-full bg-secondary"></div>
                                    </div>
                               </div>
                            </div>
                        </FormItem>

                         <Button type="submit" size="lg" className="w-full">
                            Create Organization & Continue
                        </Button>

                    </form>
                    </Form>
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
