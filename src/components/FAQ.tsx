import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "How does Banyan Tree work?",
      answer: "Simply upload your study materials (PDFs, URLs, or YouTube videos), and our AI will instantly generate flashcards and multiple-choice questions. Start reviewing in just 90 seconds!"
    },
    {
      question: "What is spaced repetition?",
      answer: "Spaced repetition is a proven learning technique where you review material at increasing intervals. Our algorithm automatically schedules cards based on how well you know them, maximizing retention while minimizing study time."
    },
    {
      question: "How does the XP system work?",
      answer: "Earn 10 XP for each correct answer and 2 XP for incorrect answers (you tried!). Level up every 100 XP and watch your Banyan Tree grow. Build streaks by studying daily for bonus motivation!"
    },
    {
      question: "What age groups is this for?",
      answer: "Banyan Tree adapts to all ages! From children (5-12) to seniors (60+), our AI adjusts question complexity and content based on your profile. Everyone can grow their learning tree."
    },
    {
      question: "Can I customize my learning experience?",
      answer: "Absolutely! Set your preferred difficulty level, daily goals, age group, and interests in your profile. We'll personalize your study decks and questions accordingly."
    },
    {
      question: "What file formats are supported?",
      answer: "We support PDFs (up to 20MB), web URLs, and YouTube videos. Just paste a link or upload your file, and we'll handle the rest!"
    },
    {
      question: "Is my data private?",
      answer: "Yes! Your study materials and progress are private to you. We use secure authentication and never share your data with third parties."
    },
    {
      question: "How long does it take to generate a deck?",
      answer: "Most decks are ready in 60-90 seconds! PDFs and longer videos may take a bit more time, but you'll get a notification when your deck is ready."
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-muted/30 to-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12 animate-grow">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about growing your learning tree 🌱
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card border border-border rounded-lg px-6 shadow-soft hover:shadow-medium transition-shadow"
            >
              <AccordionTrigger className="text-left font-semibold hover:text-primary transition-colors">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-2">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Still have questions?
          </p>
          <p className="text-foreground">
            We're here to help you succeed! 🚀
          </p>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
