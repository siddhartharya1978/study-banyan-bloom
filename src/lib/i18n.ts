import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation
      dashboard: 'Dashboard',
      profile: 'Profile',
      study: 'Study',
      signOut: 'Sign Out',
      
      // Dashboard
      welcomeBack: 'Welcome back',
      yourProgress: 'Your Progress',
      level: 'Level',
      xp: 'XP',
      streak: 'Day Streak',
      createDeck: 'Create New Study Deck',
      myDecks: 'My Study Decks',
      cards: 'cards',
      startStudy: 'Start Study',
      processing: 'Processing',
      failed: 'Failed',
      retry: 'Retry',
      
      // Content Upload
      pasteUrl: 'Paste Article URL',
      pasteYoutube: 'Paste YouTube Link',
      uploadPdf: 'Upload PDF',
      urlPlaceholder: 'https://example.com/article',
      youtubePlaceholder: 'https://youtube.com/watch?v=...',
      generate: 'Generate Study Deck',
      
      // Study
      backToDashboard: 'Back to Dashboard',
      correct: 'Correct',
      incorrect: 'Incorrect',
      skip: 'Skip',
      explain: 'Explain',
      tapToReveal: 'Tap to reveal answer',
      question: 'Question',
      answer: 'Answer',
      miniReview: 'Mini-review complete!',
      reviewAgain: 'Review Again',
      accuracy: 'Accuracy',
      
      // Profile
      personalizeYourLearning: 'Personalize Your Learning',
      displayName: 'Display Name',
      ageGroup: 'Age Group',
      difficulty: 'Preferred Difficulty',
      dailyGoal: 'Daily Goal (Cards)',
      preferredLanguage: 'Preferred Language',
      saveProfile: 'Save Profile',
      saving: 'Saving...',
      
      // Age groups
      child: 'Child (5-12)',
      teen: 'Teen (13-17)',
      adult: 'Adult (18-59)',
      senior: 'Senior (60+)',
      
      // Difficulty
      easy: 'Easy - Gentle Introduction',
      medium: 'Medium - Balanced Challenge',
      hard: 'Hard - Expert Level',
      
      // Auth
      signIn: 'Sign In',
      signUp: 'Sign Up',
      email: 'Email',
      password: 'Password',
      
      // Badges
      badges: 'Badges',
      streakVault: 'Streak Vault',
      
      // Messages
      profileUpdated: 'Profile updated! 🎉',
      deckGenerated: 'Study deck created! 🌱',
      levelUp: 'Level Up! 🎉',
      congratulations: 'Shabash!',
    }
  },
  hi: {
    translation: {
      // Navigation
      dashboard: 'डैशबोर्ड',
      profile: 'प्रोफ़ाइल',
      study: 'अध्ययन',
      signOut: 'साइन आउट',
      
      // Dashboard
      welcomeBack: 'वापसी पर स्वागत है',
      yourProgress: 'आपकी प्रगति',
      level: 'स्तर',
      xp: 'XP',
      streak: 'दिन की लकीर',
      createDeck: 'नया अध्ययन डेक बनाएं',
      myDecks: 'मेरे अध्ययन डेक',
      cards: 'कार्ड',
      startStudy: 'अध्ययन शुरू करें',
      processing: 'प्रोसेसिंग',
      failed: 'विफल',
      retry: 'पुनः प्रयास',
      
      // Content Upload
      pasteUrl: 'लेख URL पेस्ट करें',
      pasteYoutube: 'YouTube लिंक पेस्ट करें',
      uploadPdf: 'PDF अपलोड करें',
      urlPlaceholder: 'https://example.com/article',
      youtubePlaceholder: 'https://youtube.com/watch?v=...',
      generate: 'अध्ययन डेक बनाएं',
      
      // Study
      backToDashboard: 'डैशबोर्ड पर वापस',
      correct: 'सही',
      incorrect: 'ग़लत',
      skip: 'छोड़ें',
      explain: 'समझाएं',
      tapToReveal: 'उत्तर देखने के लिए टैप करें',
      question: 'प्रश्न',
      answer: 'उत्तर',
      miniReview: 'मिनी-रिव्यू पूरा हुआ!',
      reviewAgain: 'फिर से रिव्यू करें',
      accuracy: 'सटीकता',
      
      // Profile
      personalizeYourLearning: 'अपने सीखने को व्यक्तिगत बनाएं',
      displayName: 'प्रदर्शन नाम',
      ageGroup: 'आयु समूह',
      difficulty: 'पसंदीदा कठिनाई',
      dailyGoal: 'दैनिक लक्ष्य (कार्ड)',
      preferredLanguage: 'पसंदीदा भाषा',
      saveProfile: 'प्रोफ़ाइल सहेजें',
      saving: 'सहेजा जा रहा है...',
      
      // Age groups
      child: 'बच्चा (5-12)',
      teen: 'किशोर (13-17)',
      adult: 'वयस्क (18-59)',
      senior: 'वरिष्ठ (60+)',
      
      // Difficulty
      easy: 'आसान - सौम्य परिचय',
      medium: 'मध्यम - संतुलित चुनौती',
      hard: 'कठिन - विशेषज्ञ स्तर',
      
      // Auth
      signIn: 'साइन इन',
      signUp: 'साइन अप',
      email: 'ईमेल',
      password: 'पासवर्ड',
      
      // Badges
      badges: 'बैज',
      streakVault: 'स्ट्रीक वॉल्ट',
      
      // Messages
      profileUpdated: 'प्रोफ़ाइल अपडेट हो गया! 🎉',
      deckGenerated: 'अध्ययन डेक बनाया गया! 🌱',
      levelUp: 'स्तर बढ़ा! 🎉',
      congratulations: 'शाबाश!',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
