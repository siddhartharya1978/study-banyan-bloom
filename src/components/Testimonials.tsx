import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Priya S.",
      role: "Medical Student",
      content: "Banyan Tree turned my 300-page pharmacology notes into perfect flashcards in minutes. My retention has never been better!",
      rating: 5,
      image: "👩‍⚕️"
    },
    {
      name: "Arjun M.",
      role: "High School Student",
      content: "I was struggling with chemistry until I found this. The spaced repetition actually works! Went from C to A in 3 weeks.",
      rating: 5,
      image: "🎓"
    },
    {
      name: "Sarah L.",
      role: "Language Learner",
      content: "Love how I can turn YouTube videos into study decks! Learning Hindi has never been more fun. The tree visualization keeps me motivated.",
      rating: 5,
      image: "🗣️"
    },
    {
      name: "Prof. Gupta",
      role: "University Professor",
      content: "I recommend this to all my students. The AI-generated questions are surprisingly accurate and well-structured.",
      rating: 5,
      image: "👨‍🏫"
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-grow">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Loved by Learners Worldwide
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands growing their knowledge tree 🌳
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 animate-spring-in border-2 border-border/50 hover:border-primary/30"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{testimonial.image}</div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
              
              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              
              <p className="text-sm text-muted-foreground italic">
                "{testimonial.content}"
              </p>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 animate-grow" style={{ animationDelay: "400ms" }}>
          <div className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-6 py-3 rounded-full shadow-glow font-semibold">
            <Star className="h-5 w-5 fill-current" />
            <span>4.9/5 from 50,000+ learners</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
