import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Users, Shield, Palette } from 'lucide-react';
import { Header } from '@/components/header';
import { Logo } from '@/components/logo';

const features = [
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: 'Collaborative Teams',
    description: 'Create organizations and teams to manage users and plans with role-based access control.',
  },
  {
    icon: <Shield className="h-8 w-8 text-primary" />,
    title: 'Flexible Permissions',
    description: 'Control who sees what with public and private plans. Invite viewers to specific private projects.',
  },
  {
    icon: <Palette className="h-8 w-8 text-primary" />,
    title: 'Custom Theming',
    description: 'Brand your workspace with custom logos and color schemes for a personalized experience.',
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 lg:py-40">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Organize, Plan, and Achieve with Planiverse
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    The ultimate platform for collaborative planning. Bring your team together, manage projects with precision, and turn your vision into reality.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/signup">Get Started for Free</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="#">View Demo</Link>
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                 <div className="relative rounded-xl bg-card p-6 shadow-2xl w-full max-w-md">
                    <div className="flex items-center justify-between pb-4 border-b">
                        <span className="text-sm font-medium">New Project</span>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="py-4 space-y-4">
                        <div className="space-y-1">
                            <h3 className="font-semibold">Q3 Marketing Campaign</h3>
                            <p className="text-sm text-muted-foreground">Launch new campaign by EOM.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-sm">Finalize creative assets</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-muted-foreground opacity-50" />
                            <span className="text-sm text-muted-foreground line-through">Draft blog post</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-sm">Schedule social media posts</span>
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <Button className="w-full">View Plan</Button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full bg-secondary py-20 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">
                  Everything You Need to Succeed
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Planiverse provides a powerful suite of tools to streamline your workflow and enhance productivity.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-sm items-start gap-8 pt-12 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="h-full transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                  <CardHeader className="flex flex-row items-center gap-4">
                    {feature.icon}
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-24 lg:py-32">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Ready to Revolutionize Your Planning?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Join thousands of teams who are building their future with Planiverse.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
                <Button size="lg" className="w-full" asChild>
                    <Link href="/signup">Start Your Free Trial</Link>
                </Button>
              <p className="text-xs text-muted-foreground">
                No credit card required.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <div className="flex items-center">
            <Logo />
        </div>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          &copy; {new Date().getFullYear()} Planiverse. All rights reserved.
        </p>
        <nav className="sm:ml-4 flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
