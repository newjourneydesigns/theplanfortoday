import React from 'react';
export default function Home() {
  return (
    <div className="min-h-screen px-6 py-12 bg-background text-primary">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold text-heading">The Plan for Today</h1>
          <p className="mt-4 text-lg">Teamwork loves a good plan.</p>
          <p className="mt-2 text-md text-gray-600">Create and share clear, actionable plans your team can follow—every day.</p>
          <div className="mt-6 flex justify-center gap-4">
            <button className="px-6 py-2 rounded bg-cta text-white font-semibold">Get Started Free</button>
            <button className="px-6 py-2 rounded border border-cta text-cta font-semibold">See How It Works</button>
          </div>
        </header>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-heading mb-4">How It Works</h2>
          <ol className="list-decimal pl-6 space-y-4">
            <li><strong>Build the Plan:</strong> Break it down into clear sections with text, checklists, files, media, and more.</li>
            <li><strong>Share with Clarity:</strong> Assign plans to teams, roles, or individuals—only show what’s needed.</li>
            <li><strong>Keep Everyone Moving:</strong> Everyone knows what to do today. No more guessing. Just progress.</li>
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-heading mb-4">Why Teams Use It</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>✅ Aligned, Not Scattered – Everyone’s on the same page, literally.</li>
            <li>✅ Simple to Use – No learning curve. Just clarity.</li>
            <li>✅ Built for Real Life – Daily rhythms, repeatable plays, real momentum.</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-heading mb-4">What Makes It Different</h2>
          <p>Most tools manage tasks. We build plans.</p>
          <p className="mt-2">Because when your team knows the plan, they move together.</p>
        </section>

        <footer className="text-center">
          <h3 className="text-xl font-semibold mb-2">Start building your first plan today.</h3>
          <p className="mb-4">Your team will thank you tomorrow.</p>
          <button className="px-6 py-2 rounded bg-cta text-white font-semibold">Create Your Plan</button>
          <p className="mt-2 text-sm text-gray-500">Free forever. No credit card needed.</p>
        </footer>
      </div>
    </div>
  );
}
