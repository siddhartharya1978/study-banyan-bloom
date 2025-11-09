-- Add foreign key constraints for data integrity

-- cards.deck_id references decks
ALTER TABLE public.cards
ADD CONSTRAINT fk_cards_deck
FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE;

-- decks.user_id references auth.users (via profiles)
-- Note: We reference profiles since it mirrors auth.users.id
ALTER TABLE public.decks
ADD CONSTRAINT fk_decks_user
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- decks.source_id references sources
ALTER TABLE public.decks
ADD CONSTRAINT fk_decks_source
FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

-- chunks.source_id references sources
ALTER TABLE public.chunks
ADD CONSTRAINT fk_chunks_source
FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;

-- reviews.user_id references profiles
ALTER TABLE public.reviews
ADD CONSTRAINT fk_reviews_user
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- reviews.deck_id references decks
ALTER TABLE public.reviews
ADD CONSTRAINT fk_reviews_deck
FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE;

-- reviews.card_id references cards
ALTER TABLE public.reviews
ADD CONSTRAINT fk_reviews_card
FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;

-- sources.user_id references profiles
ALTER TABLE public.sources
ADD CONSTRAINT fk_sources_user
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;