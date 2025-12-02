import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

const Testimonials = () => {
  const { t } = useTranslation();
  
  const testimonials = [
    {
      name: "Priya Sharma",
      role: t('testimonials.medStudent', 'Medical Student'),
      content: t('testimonials.quote1', "Banyan Tree turned my 300-page pharmacology notes into perfect flashcards in minutes. My retention has never been better!"),
      rating: 5,
      image: "👩‍⚕️"
    },
    {
      name: "Arjun Mehta",
      role: t('testimonials.highSchool', 'High School Student'),
      content: t('testimonials.quote2', "I was struggling with chemistry until I found this. The spaced repetition actually works! Went from C to A in 3 weeks."),
      rating: 5,
      image: "🎓"
    },
    {
      name: "Ananya Patel",
      role: t('testimonials.langLearner', 'Language Learner'),
      content: t('testimonials.quote3', "Love how I can turn YouTube videos into study decks! Learning Hindi has never been more fun. The tree visualization keeps me motivated."),
      rating: 5,
      image: "🗣️"
    },
    {
      name: "Prof. Gupta",
      role: t('testimonials.professor', 'University Professor'),
      content: t('testimonials.quote4', "I recommend this to all my students. The AI-generated questions are surprisingly accurate and well-structured."),
      rating: 5,
      image: "👨‍🏫"
    }
  ];

  return (
    <section className="py-20 relative z-10">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {t('testimonials.title', 'Loved by Learners Worldwide')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('testimonials.subtitle', 'Join thousands growing their knowledge tree 🌳')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="clay-card p-6 h-full hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">{testimonial.image}</div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
                
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  "{testimonial.content}"
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <div className="clay-card inline-flex items-center gap-2 px-6 py-3 font-semibold text-foreground">
            <Star className="h-5 w-5 fill-accent text-accent" />
            <span>{t('testimonials.rating', '4.9/5 from 50,000+ learners')}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
