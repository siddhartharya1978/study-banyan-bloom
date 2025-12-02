import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const { t } = useTranslation();
  
  const faqs = [
    {
      question: t('faq.q1', 'How does Banyan Tree work?'),
      answer: t('faq.a1', "Simply upload your study materials (PDFs, URLs, or YouTube videos), and our AI will instantly generate flashcards and multiple-choice questions. Start reviewing in just 90 seconds!")
    },
    {
      question: t('faq.q2', 'What is spaced repetition?'),
      answer: t('faq.a2', "Spaced repetition is a proven learning technique where you review material at increasing intervals. Our algorithm automatically schedules cards based on how well you know them, maximizing retention while minimizing study time.")
    },
    {
      question: t('faq.q3', 'How does the XP system work?'),
      answer: t('faq.a3', "Earn 10 XP for each correct answer and 2 XP for incorrect answers (you tried!). Level up every 100 XP and watch your Banyan Tree grow. Build streaks by studying daily for bonus motivation!")
    },
    {
      question: t('faq.q4', 'What age groups is this for?'),
      answer: t('faq.a4', "Banyan Tree adapts to all ages! From children (5-12) to seniors (60+), our AI adjusts question complexity and content based on your profile. Everyone can grow their learning tree.")
    },
    {
      question: t('faq.q5', 'Can I customize my learning experience?'),
      answer: t('faq.a5', "Absolutely! Set your preferred difficulty level, daily goals, age group, and interests in your profile. We'll personalize your study decks and questions accordingly.")
    },
    {
      question: t('faq.q6', 'What file formats are supported?'),
      answer: t('faq.a6', "We support PDFs (up to 20MB), web URLs, and YouTube videos. Just paste a link or upload your file, and we'll handle the rest!")
    },
    {
      question: t('faq.q7', 'Is my data private?'),
      answer: t('faq.a7', "Yes! Your study materials and progress are private to you. We use secure authentication and never share your data with third parties.")
    },
    {
      question: t('faq.q8', 'How long does it take to generate a deck?'),
      answer: t('faq.a8', "Most decks are ready in 60-90 seconds! PDFs and longer videos may take a bit more time, but you'll get a notification when your deck is ready.")
    }
  ];

  return (
    <section className="py-20 bg-muted/30 relative z-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {t('faq.title', 'Frequently Asked Questions')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('faq.subtitle', 'Everything you need to know about growing your learning tree 🌱')}
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="clay-card px-6 border-0"
            >
              <AccordionTrigger className="text-left font-semibold hover:text-primary transition-colors py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-2">
            {t('faq.stillQuestions', 'Still have questions?')}
          </p>
          <p className="text-foreground font-medium">
            {t('faq.hereToHelp', "We're here to help you succeed! 🚀")}
          </p>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
