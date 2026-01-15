import React from 'react';
import { Icons, Button, Modal } from './Shared';

export type HelpSectionKey = 'DASHBOARD' | 'TOPIC_DETAIL' | 'PROFILE' | 'NAMES' | 'SILENCE' | 'MEMORIZE' | 'LECTIO';

const HELP_SECTIONS: Record<HelpSectionKey, { title: string; content: React.ReactNode }> = {
  DASHBOARD: {
    title: "Dashboard Help",
    content: (
      <div className="space-y-4">
        <p>The Dashboard is the central hub of your Life Rule trellis.</p>
        <ul className="space-y-2 list-disc pl-5 text-oatmeal">
          <li><strong>Active vs. Archived:</strong> Toggle between your current prayer topics and those you have archived for later reflection.</li>
          <li><strong>New Topic:</strong> Click the <span className="text-flame inline-flex items-center"><Icons.Plus size={14}/> New Topic</span> button to start a new prayer focus (e.g., "Family", "Work", "Healing").</li>
          <li><strong>Shared Topics:</strong> Topics with a <Icons.Share size={12} className="inline mx-1"/> badge are being shared via link. The "Shared with Me" section shows topics others have shared with you.</li>
          <li><strong>Journal History:</strong> View your past entries. Daily Examens are marked with a <Icons.Pen size={12} className="inline mx-1"/> pen icon, and Lectio Divina entries with a <Icons.Feather size={12} className="inline mx-1"/> feather icon.</li>
          <li><strong>Quick Actions:</strong> On any topic card, you can see how many prayer requests and verses are inside. Use the archive or trash icons for quick management.</li>
        </ul>
      </div>
    )
  },
  TOPIC_DETAIL: {
    title: "Topic Guide",
    content: (
      <div className="space-y-4">
        <p>Deep dive into a specific area of prayer.</p>
        <ul className="space-y-2 list-disc pl-5 text-oatmeal">
          <li><strong>Description:</strong> Tap the description box to toggle between "View" (clickable links) and "Edit" modes.</li>
          <li><strong>Scripture:</strong> Add Bible verses manually or use the <span className="text-flame inline-flex items-center"><Icons.Sparkles size={14}/> AI Suggestions</span> to find verses tailored to your description. Verses appear first, with the "Add Verse" button below them.</li>
          <li><strong>Prayer Points:</strong> Add specific requests as a checklist. The add form appears below your existing requests. Mark them as answered to track God's faithfulness!</li>
          <li><strong>Sharing:</strong> Click the <span className="text-flame inline-flex items-center"><Icons.Share size={14}/> Share</span> button to get a link anyone can view. Topics with a <Icons.Share size={12} className="inline mx-1"/> badge are currently being shared. Use "Stop Sharing" to disable access. Archived topics automatically stop sharing.</li>
        </ul>
      </div>
    )
  },
  PROFILE: {
    title: "Profile & Settings",
    content: (
      <div className="space-y-4">
        <p>Customize your experience and manage your data.</p>
        <ul className="space-y-2 list-disc pl-5 text-oatmeal">
          <li><strong>Themes:</strong> Choose from various visual themes like Sunset, Forest, or Oceanic. Each comes with a Light and Dark mode.</li>
          <li><strong>Account:</strong> Update your display name. Your account is tied to your email authentication.</li>
          <li><strong>End-to-End Encryption:</strong> All your sensitive data (journal entries, prayer topics) is encrypted on your device before being stored. Heart Soil staff cannot read your content.</li>
          <li><strong>Share the App:</strong> Share Heart Soil with friends using a personalized invitation message.</li>
          <li><strong>Install App:</strong> Add Heart Soil to your home screen for quick access. iOS users get step-by-step instructions.</li>
          <li><strong>Export Data:</strong> Download all your prayer topics, journal entries, and reflections as a JSON file for backup or migration.</li>
          <li><strong>Delete Account:</strong> Permanently delete all your data and account. This cannot be undone.</li>
        </ul>
      </div>
    )
  },
  NAMES: {
    title: "Names of God",
    content: (
      <div className="space-y-4">
        <p>Meditate on the character and attributes of God.</p>
        <ul className="space-y-2 list-disc pl-5 text-oatmeal">
          <li><strong>Navigation:</strong> Use the arrow buttons at the top to explore different Hebrew names of God. You can also use arrow keys on your keyboard.</li>
          <li><strong>Progress Counter:</strong> See which name you're viewing (e.g., "11 of 21") at the top of the screen.</li>
          <li><strong>Meditation:</strong> Read the meaning, pronunciation, and description to deepen your understanding.</li>
          <li><strong>Save Topic:</strong> Click <span className="text-flame inline-flex items-center"><Icons.Plus size={14}/> Save as Prayer Topic</span> to automatically create a journal entry focused on that specific attribute.</li>
        </ul>
      </div>
    )
  },
  SILENCE: {
    title: "Silence Timer",
    content: (
      <div className="space-y-4">
        <p>Practice the spiritual discipline of Solitude and Silence.</p>
        <ul className="space-y-2 list-disc pl-5 text-oatmeal">
          <li><strong>Duration:</strong> Set a timer (1-60 minutes) for your session.</li>
          <li><strong>Centering Prayer:</strong> Choose from default phrases like "Maranatha" or "Come, Lord Jesus", or add your own custom prayers. Your custom prayers appear at the top of the list.</li>
          <li><strong>Fullscreen Experience:</strong> The timer fills your entire screen with a breathing gradient animation to help you focus. The pause/resume button disappears when the session ends.</li>
          <li><strong>Gentle Chimes:</strong> A harmonious bell-like tone signals the completion of your session.</li>
        </ul>
      </div>
    )
  },
  MEMORIZE: {
    title: "Scripture Memorization",
    content: (
      <div className="space-y-4">
        <p>Hide God's word in your heart with interactive tools.</p>
        <ul className="space-y-2 list-disc pl-5 text-oatmeal">
          <li><strong>Meditation Plans:</strong> Create a long-term plan for larger passages (like a whole Chapter). Set a target date and track progress. Use next/previous buttons at the top to navigate between verses. All verses use NIV translation.</li>
          <li><strong>Quick Practice:</strong> Search for any verse to practice immediately in NIV translation.</li>
          <li><strong>Practice Modes:</strong>
            <ul className="list-circle pl-5 mt-1 space-y-1">
              <li><em>Type It:</em> Type the verse from memory.</li>
              <li><em>Speak It:</em> Recite the verse word-by-word using voice recognition. Words start hidden - use hints to reveal them. Correctly spoken words turn green.</li>
              <li><em>Fill Blanks:</em> Select missing words.</li>
              <li><em>Scramble:</em> Tap the jumbled words in the correct order. Use Undo if you make a mistake.</li>
              <li><em>Reveal Word:</em> Uncover the verse one word at a time.</li>
              <li><em>Reveal Phrase:</em> Uncover the verse chunk by chunk.</li>
              <li><em>First Letter:</em> A harder mode that shows only the first letter of each word.</li>
            </ul>
          </li>
        </ul>
      </div>
    )
  },
  LECTIO: {
    title: "Lectio Divina Guide",
    content: (
       <div className="space-y-4">
        <p>An ancient practice of "Divine Reading" to hear from God through scripture.</p>
        <ul className="space-y-2 list-disc pl-5 text-oatmeal">
          <li><strong>The Process:</strong> Guided 4-step flow: Read (Lectio), Reflect (Meditatio), Respond (Oratio), and Rest (Contemplatio).</li>
          <li><strong>Selection:</strong> Use the AI to suggest a passage or enter one manually. If a suggestion doesn't fit, use "Suggest a different passage". All passages use NIV translation for accuracy.</li>
          <li><strong>Collapsible Scripture:</strong> On mobile, tap the passage header to collapse/expand the scripture view and see more of your reflection space.</li>
          <li><strong>Journaling:</strong> Your reflections are automatically saved to your Daily Journal with a distinct <Icons.Feather size={12} className="inline mx-1"/> feather icon.</li>
        </ul>
      </div>
    )
  }
};

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: HelpSectionKey;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, section }) => {
  const data = HELP_SECTIONS[section];
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={data.title}>
      {data.content}
      <div className="mt-6 pt-4 border-t border-oatmeal/10">
        <Button onClick={onClose} className="w-full">Got it</Button>
      </div>
    </Modal>
  );
};

// Original Help Page Component (Full App Guide)
interface HelpProps {
  onBack: () => void;
}

export const Help: React.FC<HelpProps> = ({ onBack }) => {
  const features = [
    {
      icon: <Icons.Book size={24} className="text-flame" />,
      title: "Prayer Journal",
      description: "Create focused topics for different areas of your life. Add specific prayer requests, mark them as answered, and keep a history of your spiritual journey."
    },
    {
      icon: <Icons.Feather size={24} className="text-flame" />,
      title: "Lectio Divina",
      description: "Engage in the ancient practice of Divine Reading. The app guides you through the four stages: Reading, Reflecting, Responding, and Resting. AI can suggest passages, or you can choose your own."
    },
    {
      icon: <Icons.Sparkles size={24} className="text-flame" />,
      title: "AI Scripture Assistant",
      description: "Find the perfect scripture for any situation. Use the AI suggestion tool within a topic to get contextually relevant Bible verses based on your description."
    },
    {
      icon: <Icons.Heart size={24} className="text-flame" />,
      title: "Scripture Memorization",
      description: "Internalize God's word with comprehensive tools. Create Meditation Plans for larger passages to track progress over time, with easy navigation between verses. Use 'Quick Practice' for single verses with seven interactive modes: Type It (strict recall), Speak It (voice recognition with hidden words), Fill in the Blanks (multiple choice), Scramble (tap the jumbled words in order), Reveal Word (one by one), Reveal Phrase (chunk by chunk), and First Letter (hard mode)."
    },
    {
      icon: <Icons.Scroll size={24} className="text-flame" />,
      title: "Names of God",
      description: "Deepen your understanding of God's character. Navigate through His Hebrew names using the buttons at the top of the screen or arrow keys on your keyboard. Each name includes meaning, pronunciation, and a supporting verse. Save any name as a prayer topic to meditate on it."
    },
    {
      icon: <Icons.Timer size={24} className="text-flame" />,
      title: "Silence Timer",
      description: "Practice the discipline of silence and centering prayer. Set a duration, choose from default phrases or add your own custom centering prayers. Experience a fullscreen immersive timer with breathing animations and gentle chimes to guide your time with God."
    },
    {
      icon: <Icons.Leaf size={24} className="text-flame" />,
      title: "Gratitude",
      description: "Cultivate a heart of thanksgiving by keeping a running list of blessings. Add, edit, and review the ways God has been faithful. God's faithfulness yesterday gives us faith for today."
    },
    {
      icon: <Icons.User size={24} className="text-flame" />,
      title: "Themes & Customization",
      description: "Make the space your own. Visit your Profile to choose from various color themes like Sunset, Oceanic, or Forest in both Light and Dark modes."
    },
    {
      icon: <Icons.Archive size={24} className="text-flame" />,
      title: "Archives",
      description: "Keep your active dashboard focused. Archive topics you are no longer praying for daily, but keep them accessible for future reflection."
    },
    {
      icon: <Icons.Share size={24} className="text-flame" />,
      title: "Share Prayer Topics",
      description: "Invite others into your prayer journey. Share any topic via a link so friends can view your prayers and scripture. Shared topics appear in their \"Shared with Me\" section. Stop sharing anytime, and topics automatically stop sharing when archived."
    },
    {
      icon: <Icons.Shield size={24} className="text-flame" />,
      title: "End-to-End Encryption",
      description: "Your spiritual journey is private. All sensitive content (journal entries, prayer topics, reflections) is encrypted on your device using AES-256 encryption before being stored. Heart Soil administrators cannot read your encrypted data - only you have the key."
    },
    {
      icon: <Icons.Download size={24} className="text-flame" />,
      title: "Export & Delete Your Data",
      description: "You have complete control over your data. Export all your content as a JSON file for backup or migration. Delete your account and all associated data permanently at any time from your Profile settings."
    }
  ];

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-oatmeal/10">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 rounded-full bg-blue-fantastic hover:bg-flame text-palladian hover:text-blue-abyssal transition-colors flex-shrink-0"
        >
          <Icons.Back size={28} />
        </button>
        <h1 className="text-2xl font-bold text-palladian">App Guide</h1>
      </div>

      <div className="space-y-6 overflow-y-auto no-scrollbar pb-8">
        <div className="bg-blue-fantastic p-6 rounded-2xl border border-oatmeal/5 shadow-sm">
          <h2 className="text-lg font-bold text-palladian mb-2">Welcome to Heart Soil</h2>
          <p className="text-palladian leading-relaxed">
            Heart Soil is a toolkit for spiritual formation. Cultivate the soil of your heart through prayer, scripture, and silence. Better soil, not just more seed.
          </p>
        </div>

        <div className="bg-leaf-600/10 border-2 border-leaf-600/30 p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-flame mb-3 flex items-center gap-2">
            <Icons.Sunrise size={24} />
            Getting Started: Your First Practice
          </h2>
          <p className="text-palladian leading-relaxed">
            New to spiritual practices? Start here with a simple, guided practice that takes just a few minutes.
          </p>
          
          <div className="bg-blue-abyssal/50 p-4 rounded-xl border border-leaf-600/20 space-y-3">
            <h3 className="text-lg font-semibold text-flame">Recommended: Daily Examen (10 minutes)</h3>
            <p className="text-palladian leading-relaxed">
              The Daily Examen is a 500-year-old practice from St. Ignatius that helps you reflect on your day and notice where God was present. It's simple, practical, and perfect for beginners.
            </p>
            
            <div className="space-y-2 mt-3">
              <p className="text-sm text-palladian font-medium">How to start:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-palladian pl-2">
                <li>Tap the <strong className="text-palladian">Daily Examen</strong> in the navigation menu</li>
                <li>Follow the 6-step guided reflection</li>
              </ol>
            </div>
            
            <p className="text-xs text-palladian italic mt-3">
              💡 Tip: Do this before bed each night. After a week, you'll start to notice patterns in how God is moving in your life.
            </p>
          </div>
          
          <div className="bg-blue-fantastic/50 p-4 rounded-xl border border-flame/20 mt-4">
            <h4 className="text-sm font-semibold text-flame mb-2">What to try next:</h4>
            <ul className="space-y-1 text-sm text-palladian">
              <li>• <strong className="text-palladian">Prayer Topics:</strong> Create a topic for something you're praying about (family, work, healing)</li>
              <li>• <strong className="text-palladian">Silence Timer:</strong> Try 5 minutes of silence with a centering prayer</li>
              <li>• <strong className="text-palladian">Lectio Divina:</strong> Let the AI suggest a passage for sacred reading</li>
            </ul>
          </div>
        </div>

        <div className="bg-flame/10 border-2 border-flame/30 p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-flame mb-3">Practices are not Payments</h2>
          <p className="text-palladian leading-relaxed">
            Before you start, remember this: Spiritual practices are not payment plans. You are not doing these things to earn God's love or to purchase a better life. Because of the finished work of the Cross, you are already fully loved, completely forgiven, and highly favored.
          </p>
          <p className="text-palladian leading-relaxed">
            Think of these practices not as a ladder to climb to God, but as a trellis for your soul. A trellis doesn't make a vine grow; it just lifts the vine off the ground so it can catch the sunlight. These practices lift our hearts out of the dirt of daily distraction so we can catch the light of God's countenance.
          </p>
          
          <h3 className="text-lg font-bold text-flame mt-6 mb-2">The Goal is the Soil</h3>
          <p className="text-palladian leading-relaxed">
            The goal of this app isn't to make you busy; it is to make you fruitful.
          </p>
          <p className="text-palladian leading-relaxed">
            In the Parable of the Sower (Mark 4), Jesus taught that the growth depends on the soil. You are the gardener of your own heart. By following the ways of Jesus, you are breaking up the hard ground, pulling out the weeds of distraction, and watering the seed of the Gospel.
          </p>
          <p className="text-palladian leading-relaxed">
            As you use these tools, don't look for instant changes overnight. Look for the slow, steady growth of a life connected to the Vine. Look for the fruit.
          </p>
          <div className="bg-blue-abyssal/50 p-4 rounded-xl border border-flame/20 mt-4">
            <p className="text-palladian italic leading-relaxed">
              "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control."
            </p>
            <p className="text-palladian/80 text-sm mt-2">— Galatians 5:22-23</p>
          </div>
          <p className="text-palladian leading-relaxed font-medium mt-4">
            This is the life available to you. It starts by walking in His ways.
          </p>
        </div>

        <div className="space-y-4">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-4 p-4 rounded-xl bg-blue-fantastic/50 border border-oatmeal/5 hover:border-flame/30 transition-colors">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-abyssal flex items-center justify-center border border-oatmeal/10">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-bold text-palladian mb-1">{feature.title}</h3>
                <p className="text-sm text-palladian leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-fantastic p-6 rounded-2xl border border-oatmeal/5 shadow-sm mt-4">
          <h3 className="font-bold text-palladian mb-3">Terms & Privacy</h3>
          <div className="space-y-3 text-sm text-palladian leading-relaxed">
            <p>
              <strong className="text-palladian">Your Data Privacy:</strong> All sensitive data within Heart Soil (including prayer topics, journal entries, and reflections) is encrypted on your device using military-grade AES-256 encryption before being stored. Heart Soil staff cannot read your encrypted content - only you have the decryption key stored locally on your device.
            </p>
            <p>
              <strong className="text-palladian">Data Ownership:</strong> You own your data completely. Export it anytime as a JSON file or delete your account and all data permanently from Profile settings. Your data is never distributed, sold, or shared with third parties.
            </p>
            <p>
              <strong className="text-palladian">Data Usage:</strong> Your information is used solely to provide and improve the app's functionality. We use industry-standard security practices to protect your data.
            </p>
            <p>
              <strong className="text-palladian">Third-Party Services:</strong> The app uses Firebase for authentication and data storage, and Google Cloud services for AI features (Gemini API for scripture suggestions, Text-to-Speech for audio). These services operate under their respective privacy policies but do not have access to distribute your personal prayer data.
            </p>
            <p className="text-palladian/60 text-xs italic mt-4">
              By using Heart Soil, you agree to these terms. We are committed to protecting your spiritual journey and personal data.
            </p>
          </div>
        </div>

        <div className="bg-blue-fantastic p-6 rounded-2xl border border-oatmeal/5 shadow-sm text-center">
          <p className="text-palladian text-sm mb-4">Have questions or feedback?</p>
          <Button variant="secondary" className="w-full" onClick={() => window.open('mailto:newjourneydesign.co@gmail.com')}>
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
};