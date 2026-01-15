import React from 'react';

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-white scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="font-serif text-3xl md:text-4xl text-soil-900 mb-4">Ancient Practices, Modern Tools</h2>
                <p className="text-soil-600 max-w-2xl mx-auto">Organize prayer, scripture engagement, and daily silence routines without losing the depth of these timeless disciplines.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Feature 0 - Rule of Life */}
                <div className="group p-8 rounded-3xl bg-gradient-to-br from-leaf-50 to-soil-50 hover:from-white hover:to-white hover:shadow-xl hover:shadow-leaf-200/50 transition-all border-2 border-leaf-200 hover:border-leaf-300 relative overflow-hidden">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-leaf-600 text-2xl group-hover:scale-110 transition-transform relative z-10">
                        <i className="fa-solid fa-scroll"></i>
                    </div>
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <h3 className="text-xl font-bold text-soil-900">Rule of Life</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-leaf-100 text-leaf-700 rounded-full">Featured</span>
                    </div>
                    <p className="text-xs font-medium text-leaf-700 mb-3 relative z-10">Your personal faith formation planner</p>
                    <p className="text-soil-600 text-sm leading-relaxed mb-4 relative z-10">
                        Build your personal rhythm of spiritual growth habits. Track 13 practice categories weekly and watch yourself grow in Christ over time.
                    </p>
                    <div className="space-y-1.5 text-xs text-soil-500 relative z-10">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-leaf-600"></i>
                            <span>13 practice categories + custom</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-leaf-600"></i>
                            <span>Weekly reflections & history</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-leaf-600"></i>
                            <span>Auto-tracks with other features</span>
                        </div>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-leaf-100 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
                </div>

                {/* Feature 1 - Prayer List */}
                <div className="group p-8 rounded-3xl bg-soil-50 hover:bg-white hover:shadow-xl hover:shadow-soil-200/50 transition-all border border-transparent hover:border-soil-100 relative overflow-hidden">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-blue-500 text-2xl group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-heart"></i>
                    </div>
                    <h3 className="text-xl font-bold text-soil-900 mb-2">Prayer List</h3>
                    <p className="text-xs font-medium text-blue-600 mb-3">Organize prayer with intention</p>
                    <p className="text-soil-600 text-sm leading-relaxed mb-4">
                        Organize prayers by topic—family, work, spiritual growth. AI suggests Scripture verses, track answered prayers, and share with your community for deeper faith formation.
                    </p>
                    <div className="space-y-1.5 text-xs text-soil-500">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-blue-500"></i>
                            <span>AI-powered verse suggestions</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-blue-500"></i>
                            <span>Answered prayer tracking</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-blue-500"></i>
                            <span>Share & collaborate with others</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-100 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
                </div>
                {/* Feature 1 */}
                <div className="group p-8 rounded-3xl bg-soil-50 hover:bg-white hover:shadow-xl hover:shadow-soil-200/50 transition-all border border-transparent hover:border-soil-100 relative overflow-hidden">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-leaf-600 text-2xl group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-book-open"></i>
                    </div>
                    <h3 className="text-xl font-bold text-soil-900 mb-2">Lectio Divina</h3>
                    <p className="text-xs font-medium text-leaf-700 mb-3">Deep scripture engagement</p>
                    <p className="text-soil-600 text-sm leading-relaxed mb-4">
                        A guided 4-step flow: read, reflect, respond, and rest in Scripture. Perfect for daily prayer and scripture routines. AI suggests passages or choose your own.
                    </p>
                    <div className="space-y-1.5 text-xs text-soil-500">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-leaf-600"></i>
                            <span>4 guided steps with prompts</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-leaf-600"></i>
                            <span>AI passage recommendations</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-leaf-600"></i>
                            <span>Auto-saves your progress</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-leaf-100 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
                </div>

                {/* Feature 2 */}
                <div className="group p-8 rounded-3xl bg-soil-50 hover:bg-white hover:shadow-xl hover:shadow-soil-200/50 transition-all border border-transparent hover:border-soil-100 relative overflow-hidden">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-clay-500 text-2xl group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-brain"></i>
                    </div>
                    <h3 className="text-xl font-bold text-soil-900 mb-2">Scripture Memorization</h3>
                    <p className="text-xs font-medium text-clay-600 mb-3">Hide God's word in your heart</p>
                    <p className="text-soil-600 text-sm leading-relaxed mb-4">
                        Seven unique practice modes help you memorize any verse: Type It, Speak It, Fill Blanks, Scramble, Word Reveal, Phrase Reveal, and First Letter.
                    </p>
                    <div className="space-y-1.5 text-xs text-soil-500">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-clay-500"></i>
                            <span>7 interactive practice modes</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-clay-500"></i>
                            <span>Voice recognition support</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-clay-500"></i>
                            <span>Create memorization plans</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-clay-100 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
                </div>

                {/* Feature 3 - Swapped with Feature 6 (Daily Examen) */}
                <div className="group p-8 rounded-3xl bg-soil-50 hover:bg-white hover:shadow-xl hover:shadow-soil-200/50 transition-all border border-transparent hover:border-soil-100 relative overflow-hidden">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-teal-600 text-2xl group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-pen-nib"></i>
                    </div>
                    <h3 className="text-xl font-bold text-soil-900 mb-2">Daily Examen</h3>
                    <p className="text-xs font-medium text-teal-600 mb-3">Daily prayer and reflection routine</p>
                    <p className="text-soil-600 text-sm leading-relaxed mb-4">
                        Ignatian practice with 6 guided steps to reflect on where you saw God, where you struggled, and how He's leading you. Build a consistent daily prayer routine.
                    </p>
                    <div className="space-y-1.5 text-xs text-soil-500">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-teal-600"></i>
                            <span>6-step guided reflection</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-teal-600"></i>
                            <span>Scripture verses for each step</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-teal-600"></i>
                            <span>Saves to your daily journal</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-teal-100 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
                </div>

                {/* Feature 4 */}
                <div className="group p-8 rounded-3xl bg-soil-50 hover:bg-white hover:shadow-xl hover:shadow-soil-200/50 transition-all border border-transparent hover:border-soil-100 relative overflow-hidden">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-soil-600 text-2xl group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-hourglass-half"></i>
                    </div>
                    <h3 className="text-xl font-bold text-soil-900 mb-2">Silence Timer</h3>
                    <p className="text-xs font-medium text-soil-600 mb-3">Be still and know</p>
                    <p className="text-soil-600 text-sm leading-relaxed mb-4">
                        Immersive centering prayer timer with breathing animations, breath prayers, and gentle chimes. 1-60 minutes of stillness.
                    </p>
                    <div className="space-y-1.5 text-xs text-soil-500">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-soil-600"></i>
                            <span>Animated breathing visuals</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-soil-600"></i>
                            <span>Custom breath prayers</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-soil-600"></i>
                            <span>Gentle completion chime</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-soil-200 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
                </div>

                {/* Feature 5 */}
                <div className="group p-8 rounded-3xl bg-soil-50 hover:bg-white hover:shadow-xl hover:shadow-soil-200/50 transition-all border border-transparent hover:border-soil-100 relative overflow-hidden">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-amber-500 text-2xl group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-scroll"></i>
                    </div>
                    <h3 className="text-xl font-bold text-soil-900 mb-2">Names of God</h3>
                    <p className="text-xs font-medium text-amber-600 mb-3">Know His character deeper</p>
                    <p className="text-soil-600 text-sm leading-relaxed mb-4">
                        Explore 53 names of God—16 Hebrew names and 37 names of Jesus—with meanings, pronunciations, and Scripture references.
                    </p>
                    <div className="space-y-1.5 text-xs text-soil-500">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-amber-500"></i>
                            <span>53 names with full context</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-amber-500"></i>
                            <span>Hebrew & Greek meanings</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-amber-500"></i>
                            <span>Save to prayer list</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-amber-100 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
                </div>

                {/* Feature 6 */}
                <div className="group p-8 rounded-3xl bg-soil-50 hover:bg-white hover:shadow-xl hover:shadow-soil-200/50 transition-all border border-transparent hover:border-soil-100 relative overflow-hidden">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-emerald-500 text-2xl group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-soil-900 mb-2">Gratitude Practice</h3>
                    <p className="text-xs font-medium text-emerald-600 mb-3">See Jesus in your moments</p>
                    <p className="text-soil-600 text-sm leading-relaxed mb-4">
                        Quick-add blessings to your gratitude list, or take a guided 5-step journey to see Jesus in your everyday moments.
                    </p>
                    <div className="space-y-1.5 text-xs text-soil-500">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-emerald-500"></i>
                            <span>Running list of blessings</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-emerald-500"></i>
                            <span>5-step guided reflection</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-emerald-500"></i>
                            <span>Links to Rule of Life</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-100 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
                </div>

                {/* Feature 7 - Daily Journal */}
                <div className="group p-8 rounded-3xl bg-soil-50 hover:bg-white hover:shadow-xl hover:shadow-soil-200/50 transition-all border border-transparent hover:border-soil-100 relative overflow-hidden">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-soil-700 text-2xl group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-feather"></i>
                    </div>
                    <h3 className="text-xl font-bold text-soil-900 mb-2">Daily Journal</h3>
                    <p className="text-xs font-medium text-soil-700 mb-3">Create a history with God</p>
                    <p className="text-soil-600 text-sm leading-relaxed mb-4">
                        Freeform writing space for thoughts and prayers. All practices auto-save here—Examen, Lectio, Gratitude, and more.
                    </p>
                    <div className="space-y-1.5 text-xs text-soil-500">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-soil-700"></i>
                            <span>Unlimited freeform entries</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-soil-700"></i>
                            <span>Auto-saves all practices</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-check text-soil-700"></i>
                            <span>Searchable & chronological</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-soil-200 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
                </div>
            </div>
        </div>
    </section>
  );
};